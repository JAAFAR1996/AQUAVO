import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { normalizeIraqiWhatsAppPhone } from "./customer-messaging.js";

export type WhatsAppPreferenceCategory = "care" | "marketing" | "all";

export type WhatsAppPreferenceTextEvent = {
  inboundMessageId: string;
  fromPhone: string;
  receivedAt: Date;
  text: string;
};

type Row=Record<string,unknown>;

function rowsOf(result:unknown):Row[]{
  if(Array.isArray(result)) return result as Row[];
  const rows=(result as {rows?:Row[]}|null)?.rows;
  return Array.isArray(rows)?rows:[];
}

function normalizeCommand(value:unknown):string{
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ar")
    .replace(/[إأآٱ]/g,"ا")
    .replace(/[ـ]/g,"")
    .replace(/[.!؟?،,;؛:]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

const ALL_OPT_OUT=new Set([
  "الغاء",
  "ايقاف",
  "وقف الرسائل",
  "الغاء الرسائل",
  "ايقاف الرسائل",
  "لا ترسل رسائل",
  "لا ترسلون رسائل",
  "stop",
  "unsubscribe",
  "cancel",
  "stop messages",
]);

const MARKETING_OPT_OUT=new Set([
  "الغاء التذكيرات",
  "ايقاف التذكيرات",
  "وقف التذكيرات",
  "الغاء رسائل التذكير",
  "stop reminders",
  "unsubscribe reminders",
]);

const CARE_OPT_OUT=new Set([
  "الغاء المتابعة",
  "ايقاف المتابعة",
  "وقف المتابعة",
  "stop follow ups",
  "stop followups",
]);

export function resolveWhatsAppOptOutCommand(value:unknown):WhatsAppPreferenceCategory|null{
  const command=normalizeCommand(value);
  if(!command) return null;
  if(ALL_OPT_OUT.has(command)) return "all";
  if(MARKETING_OPT_OUT.has(command)) return "marketing";
  if(CARE_OPT_OUT.has(command)) return "care";
  return null;
}

function messageText(message:any):string{
  if(message?.type==="text" && typeof message?.text?.body==="string") return message.text.body;
  if(message?.type==="button" && typeof message?.button?.text==="string") return message.button.text;
  if(message?.type==="interactive" && message?.interactive?.type==="button_reply"
      && typeof message?.interactive?.button_reply?.title==="string"){
    return message.interactive.button_reply.title;
  }
  return "";
}

export function extractWhatsAppPreferenceTextEvents(payload:unknown):WhatsAppPreferenceTextEvent[]{
  if(!payload || typeof payload!=="object") return [];
  const events:WhatsAppPreferenceTextEvent[]=[];
  const entries=Array.isArray((payload as any).entry)?(payload as any).entry:[];
  for(const entry of entries){
    const changes=Array.isArray(entry?.changes)?entry.changes:[];
    for(const change of changes){
      const messages=Array.isArray(change?.value?.messages)?change.value.messages:[];
      for(const message of messages){
        const text=messageText(message).trim();
        const inboundMessageId=String(message?.id ?? "").trim();
        const fromPhone=String(message?.from ?? "").trim();
        const timestampSeconds=Number(message?.timestamp);
        const receivedAt=new Date(timestampSeconds*1000);
        if(!text || !inboundMessageId || !fromPhone || !Number.isFinite(receivedAt.getTime())) continue;
        events.push({inboundMessageId,fromPhone,receivedAt,text});
      }
    }
  }
  return events;
}

async function suppressLifecycle(phone:string,category:WhatsAppPreferenceCategory):Promise<void>{
  const db=getDb();
  if(!db) return;
  const jobTypes=category==="marketing"
    ? ["repurchase"]
    : category==="care"
      ? ["day7_care"]
      : ["day7_care","repurchase"];

  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='suppressed',
        metadata=metadata || jsonb_build_object(
          'suppressReason','whatsapp_opt_out',
          'optOutCategory',${category},
          'suppressedAt',clock_timestamp()
        ),
        updated_at=clock_timestamp()
    WHERE customer_phone=${phone}
      AND job_type IN (${sql.join(jobTypes.map((type)=>sql`${type}`),sql`,`)})
      AND status IN ('planned','ready')
  `);

  const outboxTypes=category==="marketing"
    ? ["lifecycle_repurchase","review_request","review_reminder"]
    : category==="care"
      ? ["lifecycle_day7","delivery_care"]
      : ["lifecycle_day7","lifecycle_repurchase","delivery_care","review_request","review_reminder"];

  await db.execute(sql`
    UPDATE public.customer_message_jobs j
    SET status='cancelled',
        cancelled_at=clock_timestamp(),
        last_error_code='WHATSAPP_CUSTOMER_OPT_OUT',
        last_error_at=clock_timestamp(),
        locked_at=NULL,
        metadata=j.metadata || jsonb_build_object('optOutCategory',${category}),
        updated_at=clock_timestamp()
    FROM public.orders o
    WHERE o.id=j.order_id
      AND public.aquavo_normalize_iraqi_phone(o.customer_phone)=${phone}
      AND j.job_type IN (${sql.join(outboxTypes.map((type)=>sql`${type}`),sql`,`)})
      AND j.status='pending'
  `);
}

export async function handleWhatsAppPreferenceTextEvent(event:WhatsAppPreferenceTextEvent):Promise<{
  status:"ignored"|"duplicate"|"opted_out"|"db_unavailable";
  category?:WhatsAppPreferenceCategory;
}>{
  const category=resolveWhatsAppOptOutCommand(event.text);
  if(!category) return {status:"ignored"};

  const db=getDb();
  if(!db) return {status:"db_unavailable"};

  const phone=normalizeIraqiWhatsAppPhone(event.fromPhone);
  if(!phone) return {status:"ignored"};

  const inserted=await db.execute(sql`
    INSERT INTO public.customer_whatsapp_consent_events(
      phone,category,action,source,inbound_message_id,metadata,created_at
    ) VALUES(
      ${phone},${category},'opt_out','whatsapp_reply',${event.inboundMessageId},
      jsonb_build_object('receivedAt',${event.receivedAt}),clock_timestamp()
    )
    ON CONFLICT(inbound_message_id) DO NOTHING
    RETURNING id
  `);
  if(rowsOf(inserted).length===0) return {status:"duplicate",category};

  await db.execute(sql`
    INSERT INTO public.customer_whatsapp_preferences(
      phone,care_opt_in,marketing_opt_in,care_opt_out_at,marketing_opt_out_at,
      all_opt_out_at,consent_source,last_inbound_at,created_at,updated_at
    ) VALUES(
      ${phone},
      ${category==="marketing"},
      ${category==="care"},
      CASE WHEN ${category} IN ('care','all') THEN ${event.receivedAt} ELSE NULL END,
      CASE WHEN ${category} IN ('marketing','all') THEN ${event.receivedAt} ELSE NULL END,
      CASE WHEN ${category}='all' THEN ${event.receivedAt} ELSE NULL END,
      'whatsapp_reply',${event.receivedAt},clock_timestamp(),clock_timestamp()
    )
    ON CONFLICT(phone) DO UPDATE SET
      care_opt_in=CASE
        WHEN ${category} IN ('care','all') THEN false
        ELSE public.customer_whatsapp_preferences.care_opt_in
      END,
      marketing_opt_in=CASE
        WHEN ${category} IN ('marketing','all') THEN false
        ELSE public.customer_whatsapp_preferences.marketing_opt_in
      END,
      care_opt_out_at=CASE
        WHEN ${category} IN ('care','all') THEN ${event.receivedAt}
        ELSE public.customer_whatsapp_preferences.care_opt_out_at
      END,
      marketing_opt_out_at=CASE
        WHEN ${category} IN ('marketing','all') THEN ${event.receivedAt}
        ELSE public.customer_whatsapp_preferences.marketing_opt_out_at
      END,
      all_opt_out_at=CASE
        WHEN ${category}='all' THEN ${event.receivedAt}
        ELSE public.customer_whatsapp_preferences.all_opt_out_at
      END,
      consent_source='whatsapp_reply',
      last_inbound_at=GREATEST(
        COALESCE(public.customer_whatsapp_preferences.last_inbound_at,${event.receivedAt}),
        ${event.receivedAt}
      ),
      updated_at=clock_timestamp()
  `);

  await suppressLifecycle(phone,category);
  return {status:"opted_out",category};
}
