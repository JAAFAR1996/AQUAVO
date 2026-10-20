import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addCsrfHeader } from "@/lib/csrf";

type Account = {
  id: string; name: string; kind: "cash"|"bank"|"wallet"|"card";
  linked_account_id: string|null; last_four: string|null;
  opening_balance: number|null; opening_at: string|null;
  tracked_balance: number|null; active: boolean;
  latest_reconciliation: {
    statementAt:string; statementBalance:string; trackedBalance:string;
    difference:string; evidenceNote:string;
  } | null;
};
type MoneyLine = {code:string;name_ar:string;balance:number};
type Movement = {
  id:string;kind:string;amount:number;occurred_at:string;
  from_name:string|null;to_name:string|null;instrument_name:string|null;
  note:string;external_reference:string|null;
};
type GatewayPayment = {
  payment_id:string;order_number:string|null;order_id:string;
  amount:number;method:string;order_status:string;
};
type Overview = {
  accounts:Account[];ledgerReference:MoneyLine[];movements:Movement[];
  gatewayUnmatched:GatewayPayment[];gatewayNeedsReview:GatewayPayment[];gatewayUnmatchedCount:number;
  gatewayUnmatchedGross:number|null;gatewayFeesRecorded:number|null;
};
type TreasuryForm = "accounts"|"movements"|"gateway-settlements"|"reconciliations";
const currency = (v:number|null|undefined) => v==null || !Number.isFinite(v)
  ? "غير مثبت" : `${Math.round(v).toLocaleString("en-US")} د.ع`;
const accountKind:Record<Account["kind"],string> = {
  cash:"صندوق نقدي", bank:"حساب مصرفي", wallet:"محفظة إلكترونية", card:"بطاقة مرتبطة بحساب"
};
const movementKind:Record<string,string> = {
  deposit:"إيداع / قبض فعلي",withdrawal:"سحب / دفع فعلي",
  transfer:"تحويل داخلي",gateway_payout:"تسوية بوابة دفع"
};
const fieldStyle:CSSProperties={width:"100%",minHeight:42,border:"1px solid #2a5264",
  background:"#071a24",color:"#f6f4ef",borderRadius:8,padding:"8px 10px",fontSize:13};
const infoStyle:CSSProperties={color:"#a9bdc9",fontSize:12,lineHeight:1.8};
const panelStyle:CSSProperties={background:"#0d2530",border:"1px solid #28505c",
  borderRadius:12,padding:15,display:"grid",gap:12};
const buttonStyle:CSSProperties={background:"#0B93A6",border:0,color:"white",
  borderRadius:8,padding:"11px 14px",fontWeight:750,minHeight:42,cursor:"pointer"};
function Field({label,children}:{label:string;children:ReactNode}) {
  return <label style={{display:"grid",gap:6,fontSize:12,color:"#dce9ec"}}>{label}{children}</label>;
}
function clockValue() {
  const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
async function request<T>(path:string,body?:Record<string,unknown>):Promise<T>{
  const response=await fetch(path,{credentials:"include",method:body?"POST":"GET",
    headers:body?addCsrfHeader({"Content-Type":"application/json"}):undefined,
    body:body?JSON.stringify(body):undefined});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data?.message==="TREASURY_MIGRATION_0103_REQUIRED"
    ? "ميزة الخزينة تحتاج ترحيل قاعدة البيانات 0103 قبل تشغيلها."
    : data?.message ?? "فشل تحميل بيانات الخزينة");
  return data as T;
}
function dateIso(value:string):string{
  const date=new Date(value);if(!Number.isFinite(date.getTime()))throw new Error("حدد تاريخاً صحيحاً");
  return date.toISOString();
}

export function FinanceTreasury(){
  const qc=useQueryClient();
  const overview=useQuery({queryKey:["aquavo-treasury-v1"],queryFn:()=>request<Overview>("/api/admin/accounting/v2/treasury"),
    staleTime:15_000,refetchInterval:60_000,retry:false});
  const accounts=overview.data?.accounts ?? [];
  const base=useMemo(()=>accounts.filter(a=>a.kind!=="card"&&a.active),[accounts]);
  const available=useMemo(()=>base.filter(a=>a.opening_balance!==null),[base]);
  const missing=base.length-available.length;
  const balanceTotal=available.reduce((sum,a)=>sum+(a.tracked_balance??0),0);
  const ledger=new Map((overview.data?.ledgerReference??[]).map(l=>[l.code,l.balance]));

  const [form,setForm]=useState<TreasuryForm>("accounts");
  const [accountName,setAccountName]=useState("");
  const [accountType,setAccountType]=useState<Account["kind"]>("bank");
  const [linkedId,setLinkedId]=useState("");
  const [lastFour,setLastFour]=useState("");
  const [openingConfirmed,setOpeningConfirmed]=useState(false);
  const [openingBalance,setOpeningBalance]=useState("");
  const [openingAt,setOpeningAt]=useState(clockValue);
  const [openingNote,setOpeningNote]=useState("");
  const [openingTarget,setOpeningTarget]=useState("");
  const [movementType,setMovementType]=useState("deposit");
  const [fromAccount,setFromAccount]=useState("");
  const [toAccount,setToAccount]=useState("");
  const [movementAmount,setMovementAmount]=useState("");
  const [movementAt,setMovementAt]=useState(clockValue);
  const [reference,setReference]=useState("");
  const [memo,setMemo]=useState("");
  const [evidence,setEvidence]=useState("");
  const [paymentId,setPaymentId]=useState("");
  const [gatewayDestination,setGatewayDestination]=useState("");
  const [gatewayFee,setGatewayFee]=useState("");
  const [gatewayReference,setGatewayReference]=useState("");
  const [gatewayEvidence,setGatewayEvidence]=useState("");
  const [reconcileAccount,setReconcileAccount]=useState("");
  const [statementBalance,setStatementBalance]=useState("");
  const [statementDate,setStatementDate]=useState(clockValue);
  const [statementEvidence,setStatementEvidence]=useState("");
  const [notice,setNotice]=useState<string|null>(null);
  const [failure,setFailure]=useState<string|null>(null);

  const save=useMutation({
    mutationFn:({endpoint,body}:{endpoint:string;body:Record<string,unknown>})=>
      request<Record<string,unknown>>(`/api/admin/accounting/v2/treasury/${endpoint}`,body),
    onSuccess:async()=>{
      setFailure(null);setNotice("تم تسجيل العملية في سجل الخزينة. رصيد دفتر الأستاذ لا يتغير تلقائياً.");
      await qc.invalidateQueries({queryKey:["aquavo-treasury-v1"]});
    },
    onError:(err)=>{setNotice(null);setFailure(err instanceof Error?err.message:"فشل حفظ العملية");}
  });
  const submit=(endpoint:string,body:Record<string,unknown>)=>{
    if(save.isPending)return;setNotice(null);setFailure(null);
    try{save.mutate({endpoint,body});}catch(err){setFailure(err instanceof Error?err.message:"مدخلات غير صالحة");}
  };
  const activeOptions=accounts.filter(a=>a.active&&
    (a.kind==="card"?accounts.find(p=>p.id===a.linked_account_id)?.opening_balance!=null:a.opening_balance!=null));
  const bankOptions=base.filter(a=>(a.kind==="bank"||a.kind==="wallet")&&a.opening_balance!==null);

  return <div dir="rtl" style={{display:"grid",gap:16,color:"#f6f4ef"}} data-testid="aquavo-treasury">
    <section style={panelStyle}>
      <h2 style={{margin:0,fontSize:19}}>الخزينة — وين فلوسي؟</h2>
      <p style={{...infoStyle,margin:0}}>الأرقام الدفترية تختلف عن النقد الحقيقي. ما نعتبر الأموال المتحققة عبر Wayl رصيداً بالبنك
        إلا بعد إثبات التحويل. وكل بطاقة مرتبطة بحساب ما تنحسب مرتين.</p>
      {overview.isLoading&&<p style={infoStyle}>جاري جلب حسابات وأرصدة الخزينة...</p>}
      {overview.error&&<div role="alert" style={{color:"#fecaca"}}>{overview.error instanceof Error?overview.error.message:"فشل الاتصال"}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
        {[
          ["الصندوق حسب اليومية",ledger.get("1000"),"مرجع محاسبي، غير مطابق مع النقد"],
          ["البنك حسب اليومية",ledger.get("1010"),"حساب عام، مو كشف بنك"],
          ["COD لدى التوصيل",ledger.get("1100"),"ذمم؛ مو فلوس بالصندوق"],
          ["مدفوع إلكترونياً دون إثبات تحويل",overview.data?.gatewayUnmatchedGross,
            `${overview.data?.gatewayUnmatchedCount??0} دفعة تحتاج مطابقة`],
          ["الحسابات المتتبعة",base.length>0&&missing===0?balanceTotal:null,
            missing?`${missing} حساب بلا رصيد افتتاحي؛ ما نعرض إجمالي ناقص`:
            base.length?"مجموع حسابات فعلية؛ لا يُجمع مع اليومية":"أضف حساباً ورصيداً افتتاحياً أولاً"],
        ].map(([title,value,detail])=><div key={String(title)} style={{...panelStyle,gap:5}}>
          <span style={infoStyle}>{title}</span>
          <strong style={{fontSize:20}}>{currency(typeof value==="number"?value:null)}</strong>
          <span style={infoStyle}>{detail}</span>
        </div>)}
      </div>
    </section>

    <section style={panelStyle}>
      <h3 style={{margin:0,fontSize:16}}>الحسابات والبطاقات</h3>
      {accounts.length===0?<p style={infoStyle}>ماكو حسابات خزينة مضافة بعد. ما راح نخمن أرصدة البطاقات.</p>:null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:10}}>
        {accounts.map(a=>{
          const linked=accounts.find(x=>x.id===a.linked_account_id);
          const alias=a.kind==="card";
          const matched=a.latest_reconciliation?Number(a.latest_reconciliation.difference)===0:false;
          return <article key={a.id} style={{border:"1px solid #2a5264",padding:12,borderRadius:9,display:"grid",gap:5}}>
            <strong>{a.name}{a.last_four?` •••• ${a.last_four}`:""}</strong>
            <span style={infoStyle}>{accountKind[a.kind]}{alias?` — مرتبط بـ ${linked?.name??"حساب غير معروف"}`:""}</span>
            <span style={{fontWeight:700,fontSize:18}}>{alias?currency(linked?.tracked_balance):currency(a.tracked_balance)}</span>
            {alias?<span style={infoStyle}>رصيد الحساب المرتبط نفسه، مو رصيد إضافي وما يدخل بالمجموع مرتين.</span>
            :a.opening_balance===null?<span style={{...infoStyle,color:"#fcd34d"}}>الرصيد الافتتاحي غير مثبت</span>
            :<span style={infoStyle}>افتتاحي {currency(a.opening_balance)} — {new Date(a.opening_at!).toLocaleDateString("ar-IQ")}</span>}
            {!alias&&<span style={{...infoStyle,color:matched?"#a7f3d0":"#fcd34d"}}>
              {a.latest_reconciliation?
                `آخر مطابقة: ${matched?"مطابق":"فرق "+currency(Number(a.latest_reconciliation.difference))} — ${new Date(a.latest_reconciliation.statementAt).toLocaleDateString("ar-IQ")}`
                :"ماكو كشف حساب مطابق بعد"}
            </span>}
          </article>;
        })}
      </div>
    </section>

    <section style={panelStyle}>
      <h3 style={{margin:0,fontSize:16}}>تسجيل ومطابقة</h3>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {([["accounts","إضافة حساب أو بطاقة"],["movements","حركة مالية"],["gateway-settlements","تسوية Wayl"],["reconciliations","مطابقة كشف الحساب"]] as const)
          .map(([key,label])=><button key={key} onClick={()=>{setForm(key);setFailure(null);setNotice(null);}}
            style={{...buttonStyle,background:form===key?"#0B93A6":"#163947"}}>{label}</button>)}
      </div>
      {notice&&<div role="status" style={{color:"#a7f3d0"}}>{notice}</div>}
      {failure&&<div role="alert" style={{color:"#fecaca"}}>{failure}</div>}
      {form==="accounts"&&<form onSubmit={e=>{e.preventDefault();
        const payload:Record<string,unknown>={name:accountName,kind:accountType};
        if(lastFour)payload.lastFour=lastFour;
        if(accountType==="card")payload.linkedAccountId=linkedId;
        else if(openingConfirmed){
          if(openingBalance.trim()===""||!openingNote.trim()){setFailure("حدد المبلغ والمستند أو سبب التأكيد");return;}
          payload.openingBalance=Number(openingBalance);
          payload.openingAt=dateIso(openingAt);payload.openingNote=openingNote;
        }
        submit("accounts",payload);}} style={{display:"grid",gap:10}}>
        <Field label="اسم الحساب أو البطاقة"><input required style={fieldStyle} value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="مثال: حساب المشروع - بنك بغداد" /></Field>
        <Field label="نوع الحساب"><select style={fieldStyle} value={accountType} onChange={e=>setAccountType(e.target.value as Account["kind"])}>
          {Object.entries(accountKind).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></Field>
        {accountType==="card"&&<Field label="الحساب البنكي أو المحفظة الممولة للبطاقة">
          <select required style={fieldStyle} value={linkedId} onChange={e=>setLinkedId(e.target.value)}><option value="">اختر حساباً</option>
          {base.filter(a=>a.kind==="bank"||a.kind==="wallet").map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        {accountType!=="cash"&&<Field label="آخر 4 أرقام فقط — اختياري"><input style={fieldStyle} value={lastFour} maxLength={4} onChange={e=>setLastFour(e.target.value.replace(/\D/g,""))} placeholder="1234" /></Field>}
        {accountType!=="card"&&<>
          <label style={infoStyle}><input type="checkbox" checked={openingConfirmed} onChange={e=>setOpeningConfirmed(e.target.checked)}/> عندي رصيد افتتاحي مؤكد من كشف الحساب / النقد</label>
          {openingConfirmed&&<>
            <Field label="الرصيد المؤكد (دينار)"><input required type="number" step="1" style={fieldStyle} value={openingBalance} onChange={e=>setOpeningBalance(e.target.value)} /></Field>
            <Field label="تاريخ ووقت الرصيد"><input required type="datetime-local" style={fieldStyle} value={openingAt} onChange={e=>setOpeningAt(e.target.value)} /></Field>
            <Field label="دليل الرصيد / تفاصيل الكشف"><textarea required style={fieldStyle} value={openingNote} onChange={e=>setOpeningNote(e.target.value)} /></Field>
          </>}
        </>}
        <p style={infoStyle}>تأكيد الرصيد مصدره كشف الحساب أو الجرد الحقيقي، مو المبيعات الدفترية. البطاقة تستعمل رصيد حسابها الأصلي.</p>
        <button disabled={save.isPending} style={buttonStyle}>إضافة الحساب</button>
      </form>}
      {form==="accounts"&&base.some(a=>a.opening_balance===null)&&<form onSubmit={e=>{
        e.preventDefault();
        if(!openingTarget||openingBalance.trim()===""||!openingNote.trim()){
          setFailure("اختر الحساب والمبلغ ودليل الرصيد");return;
        }
        submit(`accounts/${openingTarget}/opening`,{
          openingBalance:Number(openingBalance),openingAt:dateIso(openingAt),openingNote
        });
      }} style={{display:"grid",gap:10,borderTop:"1px solid #28505c",paddingTop:15}}>
        <h4 style={{margin:0}}>تثبيت الرصيد الافتتاحي لحساب مضاف سابقا</h4>
        <Field label="الحساب غير المثبت"><select required style={fieldStyle} value={openingTarget} onChange={e=>setOpeningTarget(e.target.value)}>
          <option value="">اختر حساباً</option>
          {base.filter(a=>a.opening_balance===null).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select></Field>
        <Field label="الرصيد الفعلي عند بداية التسجيل">
          <input required type="number" step="1" style={fieldStyle} value={openingBalance} onChange={e=>setOpeningBalance(e.target.value)} />
        </Field>
        <Field label="تاريخ ووقت الرصيد"><input required type="datetime-local" style={fieldStyle} value={openingAt} onChange={e=>setOpeningAt(e.target.value)} /></Field>
        <Field label="كشف الحساب أو سبب التأكيد"><textarea required minLength={5} style={fieldStyle} value={openingNote} onChange={e=>setOpeningNote(e.target.value)}/></Field>
        <button disabled={save.isPending} style={buttonStyle}>تثبيت الافتتاحي مرة واحدة</button>
      </form>}

      {form==="movements"&&<form onSubmit={e=>{e.preventDefault();
        if(movementAmount.trim()===""){setFailure("اكتب مبلغ الحركة");return;}
        submit("movements",{kind:movementType,
          ...(movementType!=="deposit"?{fromAccountId:fromAccount}:{}),
          ...(movementType!=="withdrawal"?{toAccountId:toAccount}:{}),
          amount:Number(movementAmount),occurredAt:dateIso(movementAt),
          reference:reference||undefined,note:memo,evidenceNote:evidence});}} style={{display:"grid",gap:10}}>
        <Field label="نوع الحركة"><select style={fieldStyle} value={movementType} onChange={e=>setMovementType(e.target.value)}>
          {["deposit","withdrawal","transfer"].map(k=><option key={k} value={k}>{movementKind[k]}</option>)}</select></Field>
        {movementType!=="deposit"&&<Field label="من حساب / بطاقة"><select required style={fieldStyle} value={fromAccount} onChange={e=>setFromAccount(e.target.value)}>
          <option value="">اختر المصدر</option>{activeOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        {movementType!=="withdrawal"&&<Field label="إلى حساب / بطاقة"><select required style={fieldStyle} value={toAccount} onChange={e=>setToAccount(e.target.value)}>
          <option value="">اختر الوجهة</option>{activeOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>}
        <Field label="المبلغ"><input required type="number" min="1" step="1" style={fieldStyle} value={movementAmount} onChange={e=>setMovementAmount(e.target.value)} /></Field>
        <Field label="وقت الحركة"><input required type="datetime-local" style={fieldStyle} value={movementAt} onChange={e=>setMovementAt(e.target.value)} /></Field>
        <Field label="المرجع المصرفي — اختياري"><input style={fieldStyle} value={reference} onChange={e=>setReference(e.target.value)} /></Field>
        <Field label="سبب الحركة"><input required minLength={5} style={fieldStyle} value={memo} onChange={e=>setMemo(e.target.value)} placeholder="مثال: دفع تكاليف الشحن" /></Field>
        <Field label="دليل الحركة / رقم الوصل"><textarea required minLength={5} style={fieldStyle} value={evidence} onChange={e=>setEvidence(e.target.value)} /></Field>
        <p style={infoStyle}>هذه حركة خزينة فقط؛ المصاريف تحتاج اعتمادها كذلك في السجل المحاسبي. التحويل بين حسابين ما يعتبر إيراد أو مصروف.</p>
        <button disabled={save.isPending} style={buttonStyle}>تسجيل الحركة</button>
      </form>}

      {form==="gateway-settlements"&&<form onSubmit={e=>{e.preventDefault();
        if(gatewayFee.trim()===""){setFailure("حدد العمولة من كشف Wayl حتى لو صفر مثبت");return;}
        submit("gateway-settlements",{paymentId,toAccountId:gatewayDestination,
          feeAmount:Number(gatewayFee),occurredAt:dateIso(movementAt),
          reference:gatewayReference,evidenceNote:gatewayEvidence});}} style={{display:"grid",gap:10}}>
        <Field label="الدفعة الإلكترونية غير المطابقة">
          <select required style={fieldStyle} value={paymentId} onChange={e=>setPaymentId(e.target.value)}><option value="">اختر عملية دفع</option>
            {overview.data?.gatewayUnmatched.map(p=><option key={p.payment_id} value={p.payment_id}>
              {p.order_number??p.order_id.slice(0,8)} — {currency(p.amount)} — {p.method}</option>)}</select></Field>
        <Field label="الحساب الذي استلم الحوالة فعلياً"><select required style={fieldStyle} value={gatewayDestination} onChange={e=>setGatewayDestination(e.target.value)}>
          <option value="">اختر البنك أو المحفظة</option>{bankOptions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="عمولة البوابة المثبتة (دينار) — اكتب 0 فقط إذا متأكد"><input required type="number" min="0" step="1" style={fieldStyle} value={gatewayFee} onChange={e=>setGatewayFee(e.target.value)}/></Field>
        <Field label="وقت وصول الحوالة"><input required type="datetime-local" style={fieldStyle} value={movementAt} onChange={e=>setMovementAt(e.target.value)}/></Field>
        <Field label="المرجع البنكي / رقم التسوية"><input required minLength={3} style={fieldStyle} value={gatewayReference} onChange={e=>setGatewayReference(e.target.value)}/></Field>
        <Field label="دليل التحويل / تفاصيل كشف الحساب"><textarea required minLength={5} style={fieldStyle} value={gatewayEvidence} onChange={e=>setGatewayEvidence(e.target.value)} /></Field>
        <p style={infoStyle}>اختيار الدفعة ينقل صافيها إلى حساب الخزينة مرة واحدة؛ لا يضيف مبيعات جديدة. العمولة تحتاج قيد مصروف منفصل عند المطابقة المحاسبية.</p>
        <button disabled={save.isPending} style={buttonStyle}>إثبات وصول التسوية</button>
      </form>}

      {form==="reconciliations"&&<form onSubmit={e=>{e.preventDefault();
        if(statementBalance.trim()===""){setFailure("اكتب الرصيد الحقيقي بكشف الحساب");return;}
        submit("reconciliations",{accountId:reconcileAccount,statementAt:dateIso(statementDate),
          statementBalance:Number(statementBalance),evidenceNote:statementEvidence});}} style={{display:"grid",gap:10}}>
        <Field label="الحساب المراد مطابقته"><select required style={fieldStyle} value={reconcileAccount} onChange={e=>setReconcileAccount(e.target.value)}>
          <option value="">اختر حساباً</option>{available.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="الرصيد الفعلي في الكشف أو الجرد"><input required type="number" step="1" style={fieldStyle} value={statementBalance} onChange={e=>setStatementBalance(e.target.value)} /></Field>
        <Field label="وقت الرصيد الحقيقي"><input required type="datetime-local" style={fieldStyle} value={statementDate} onChange={e=>setStatementDate(e.target.value)} /></Field>
        <Field label="مصدر الكشف / تفاصيل الجرد"><textarea required minLength={5} style={fieldStyle} value={statementEvidence} onChange={e=>setStatementEvidence(e.target.value)} /></Field>
        <p style={infoStyle}>إذا طلع فرق، يظل ظاهر للتدقيق. المطابقة ما تغير الرصيد أو القيود آلياً.</p>
        <button disabled={save.isPending} style={buttonStyle}>تسجيل المطابقة</button>
      </form>}
    </section>

    <section style={panelStyle}>
      <h3 style={{margin:0,fontSize:16}}>مدفوعات البطاقة عبر Wayl — لم نجد لها تسوية موثقة بالخزينة</h3>
      <p style={infoStyle}>الدفع المؤكد يعني الزبون دفع للبوابة، مو دليل أن المبلغ وصل للبطاقة أو للبنك. استبعدنا الطلبات التجريبية.</p>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",minWidth:600,borderCollapse:"collapse",fontSize:12}}>
          <thead><tr><th>الطلب</th><th>المبلغ</th><th>البوابة</th><th>حالة الطلب</th><th>الحالة المالية</th></tr></thead>
          <tbody>{overview.data?.gatewayUnmatched.map(p=><tr key={p.payment_id}>
            <td>{p.order_number??p.order_id.slice(0,8)}</td><td>{currency(p.amount)}</td><td>{p.method}</td>
            <td>{p.order_status}</td><td>تحتاج دليل تسوية</td></tr>)}</tbody>
        </table>
      </div>
      {overview.data?.gatewayUnmatchedCount===0&&<p style={infoStyle}>لا توجد دفعات إلكترونية غير مطابقة بحسب سجل الخزينة الحالي.</p>}
      {(overview.data?.gatewayUnmatchedCount??0)>80&&<p style={infoStyle}>الجدول يعرض آخر 80 دفعة؛ الإجمالي يشمل جميع الدفعات.</p>}
    </section>

    {(overview.data?.gatewayNeedsReview?.length??0)>0&&<section style={{...panelStyle,borderColor:"#92400e"}}>
      <h3 style={{margin:0,fontSize:16,color:"#fcd34d"}}>دفعات إلكترونية عليها استرجاع أو اعتراض — تحتاج مراجعة</h3>
      <p style={infoStyle}>استبعدنا هاي الدفعات من مبلغ «بانتظار التحويل» حتى ما نعرض فلوس قد تكون مسترجعة.
        ما نقدر نسوي تسوية تلقائية لها قبل المطابقة مع Wayl وكشف البنك.</p>
      {overview.data?.gatewayNeedsReview.map(p=><div key={p.payment_id} style={{fontSize:12,padding:"6px 0",borderBottom:"1px solid #28505c"}}>
        {p.order_number??p.order_id.slice(0,8)} — {currency(p.amount)} — {p.method} — مراجعة الاسترجاع
      </div>)}
    </section>}
    <section style={panelStyle}>
      <h3 style={{margin:0,fontSize:16}}>آخر حركات الخزينة</h3>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",minWidth:650,borderCollapse:"collapse",fontSize:12}}>
        <thead><tr><th>الوقت</th><th>الحركة</th><th>من</th><th>إلى</th><th>المبلغ</th><th>الوصف</th></tr></thead>
        <tbody>{overview.data?.movements.map(m=><tr key={m.id}>
          <td>{new Date(m.occurred_at).toLocaleString("ar-IQ",{timeZone:"Asia/Baghdad"})}</td>
          <td>{movementKind[m.kind]??m.kind}</td><td>{m.from_name??"خارجي"}</td>
          <td>{m.to_name??"خارجي"}</td><td>{currency(m.amount)}</td>
          <td>{m.note}{m.instrument_name?` (بواسطة ${m.instrument_name})`:""}</td>
        </tr>)}</tbody>
      </table></div>
      {overview.data?.movements.length===0&&<p style={infoStyle}>ماكو حركات يدوية مسجلة بعد.</p>}
    </section>
    <style>{`[data-testid="aquavo-treasury"] td,[data-testid="aquavo-treasury"] th{padding:9px;text-align:right;border-bottom:1px solid #254854;white-space:normal}[data-testid="aquavo-treasury"] button:disabled{opacity:.5;cursor:wait}`}</style>
  </div>;
}
