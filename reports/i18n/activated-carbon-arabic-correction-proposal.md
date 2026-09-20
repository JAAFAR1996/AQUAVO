# Arabic editorial correction proposal — `activated-carbon-aquarium-when-to-use`

**Status: proposal only. Nothing has been modified, in any locale.**

- Article id: `e08f8e86-bf1d-43b0-a17b-ad976d86d720`
- Slug: `activated-carbon-aquarium-when-to-use`
- Title: استخدام الفحم النشط (Carbon) في الحوض: متى يجب وضعه ومتى نرفعه؟
- Published: yes · 28 block elements · Arabic is the source of record

---

## 1. The contradiction, in the Arabic itself

The article states both that activated carbon removes ammonia and nitrite, and that it does
not treat ammonia. Same article, ~10 blocks apart.

### Side A — carbon removes ammonia/nitrite (three blocks)

**Block #6** — inside the list "الفحم النشط يمكن أن يامتص:"
```html
<li>الأمونيا والنتريت، التي يمكن أن تكون ضارة للأسماك</li>
```

**Block #11** — inside "متى يجب وضع الفحم النشط في الحوض؟"
```html
<li>عندما تكون مستويات الأمونيا أو النتريت عالية</li>
```

**Block #19** — inside "متى يجب إزالة الفحم النشط من الحوض؟"
```html
<li>عندما تنخفض مستويات الأمونيا أو النتريت إلى مستويات آمنة</li>
```

### Side B — carbon does **not** treat ammonia (one block)

**Block #24**
```html
<p>والفحم النشط يزيل الكلور وبقايا الأدوية والروائح، لكنه لا يعالج الأمونيا ويفقد فعاليته خلال أسابيع فيحتاج استبدالاً دورياً. يمكن أن يامتص الفحم النشط الكلور الزائد، مما يساهم في الحفاظ على صحة الأسماك.</p>
```

### And the conclusion repeats side A

**Block #26**
```html
<p>يعد الفحم النشط مكونًا أساسيًا في نظام الترشيح للحوض، ويمكن أن يلعب دورًا هامًا في الحفاظ على جودة الماء وصحته. يجب وضع الفحم النشط في الحوض عندما تكون مستويات الأمونيا أو النتريت عالية، أو عندما تظهر روائح كريهة من الماء. يجب إزالة الفحم النشط من الحوض عندما تنخفض مستويات الأمونيا أو النتريت إلى مستويات آمنة، أو عندما تختفي الروائح الكريهة من الماء.</p>
```

**Why this one matters beyond tidiness.** Side A is not merely inconsistent, it is the
dangerous half: a customer reading "put carbon in when ammonia is high" will treat an
ammonia spike with a media bag that does nothing for it, while the fish stay in the ammonia.
Side B is the correct statement. The minimal fix is therefore to make the article agree with
the block it already gets right — **#24 is kept and the other four are brought into line**,
rather than rewriting the article.

---

## 2. Proposed edits — 5 blocks, nothing else

Each is the smallest change that removes the false claim and leaves a true, useful one in its
place. Voice matches the rest of the corpus: no emoji, no invented figures, no new product claims.

### Block #6 — the "what carbon absorbs" list

```diff
-<li>الأمونيا والنتريت، التي يمكن أن تكون ضارة للأسماك</li>
+<li>الكلور والكلورامين بعد تغيير الماء</li>
```

### Block #11 — when to add it

```diff
-<li>عندما تكون مستويات الأمونيا أو النتريت عالية</li>
+<li>بعد انتهاء دورة علاج دوائي، لسحب بقايا الدواء من الماء</li>
```

### Block #19 — when to remove it

```diff
-<li>عندما تنخفض مستويات الأمونيا أو النتريت إلى مستويات آمنة</li>
+<li>قبل البدء بعلاج دوائي جديد، لأن الفحم يسحب الدواء ويلغي مفعوله</li>
```

### Block #24 — keep the content, fix one broken verb

```diff
-يمكن أن يامتص الفحم النشط الكلور الزائد، مما يساهم في الحفاظ على صحة الأسماك.
+يمكن أن يمتص الفحم النشط الكلور الزائد، مما يساهم في الحفاظ على صحة الأسماك.
```

### Block #26 — the conclusion

```diff
-يجب وضع الفحم النشط في الحوض عندما تكون مستويات الأمونيا أو النتريت عالية، أو عندما تظهر روائح كريهة من الماء. يجب إزالة الفحم النشط من الحوض عندما تنخفض مستويات الأمونيا أو النتريت إلى مستويات آمنة، أو عندما تختفي الروائح الكريهة من الماء.
+يجب وضع الفحم النشط في الحوض عندما تظهر روائح كريهة أو اصفرار في الماء، أو بعد انتهاء علاج دوائي. يجب إزالته عندما تختفي الروائح، أو بعد مرور أسابيع قليلة لأن فعاليته تنتهي، أو قبل البدء بعلاج دوائي جديد. الأمونيا والنتريت لا يعالجهما الفحم النشط — يعالجهما تغيير الماء والدورة البايولوجية في الفلتر.
```

That last sentence is the one addition. Without it the article says what carbon does not do
but never says what the reader should actually do about ammonia, which is the whole reason
they opened the page.

### Optional, same pass — three non-Arabic letters in the Arabic source

Separate from the contradiction, and safe to fold into the same edit since it touches the
same article. The source contains the Persian/Sorani letters ی and ک in three places:

- Block #1: `يعد الحوض یکی من أجمل` → `يعد الحوض واحداً من أجمل`
- Block #5: `فإنه يامتص` → `فإنه يمتص`, and `يمكن أن يامتص` → `يمكن أن يمتص`

---

## 3. Not proposed, deliberately

- **Block #13** (`بعد تغيير الماء بنسبة 25% أو أكثر` as a reason to add carbon) is weak advice
  but it is not false and not dangerous. Flagged, not changed — this proposal stays minimal.
- **Blocks #16 and #27** mention AQUAVO carbon. Untouched: they make no claim that the
  correction contradicts.

---

## 4. Order of operations — Arabic first, always

1. A human approves the Arabic above, and it is applied to the Arabic source (the article
   lives in the database, so this is a production content edit and needs its own approval and
   its own diff).
2. The Arabic `sourceHash` for this entity changes, so the validator marks the `en` and `ckb`
   rows **outdated** — which is exactly the desired signal, not a regression.
3. Both translations are regenerated for this article through the existing pipeline
   (`TOOLS/i18n/translate-content.ts`). **This needs a provider**, which is currently
   unavailable (see the article blocker in the checkpoint), so step 3 is blocked with step 1.
4. Neither locale is marked reviewed by that run.

**EN and CKB are not touched before step 1.** They currently reproduce the Arabic
contradiction faithfully, which is the correct behaviour for a translation: fixing them first
would silently fork the locales from their source, and the Arabic — the version most AQUAVO
customers actually read — would keep the dangerous advice.
