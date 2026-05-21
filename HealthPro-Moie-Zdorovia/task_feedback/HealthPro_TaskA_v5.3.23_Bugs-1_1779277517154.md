# HealthPro · Сесія v5.3.23 — Завдання A: Баги польового тесту
## Знайдено при реальному тестуванні 17.05.2026

---

## ПРАВИЛА (обов'язково)

1. Виконувати блоки **строго по черзі**. Не переходити далі без підтвердження.
2. **НЕ робити `git commit`** до явного дозволу ("можеш комітити").
3. Після кожного блоку показати:
   ```bash
   npm test
   git diff --stat
   grep -n "конкретний рядок" файл.js
   ```
4. Не чіпати файли що не вказані в задачі.
5. Шляхи файлів у звіті — тільки перевірені через `ls` або `grep`.

---

## БЛОК 1 — Журнал: колір крапки та категорія при AHA
### Задачі: JN-color, JN-cat

**Файл:** `src/features/pressure/norm.js`

**Проблема 1 (JN-cat):** Запис **128/80** при AHA 2017 показує
`"HTN Ст. 1 (АНА)"` — **неправильно**.

За AHA 2017:
- Elevated = 120–129 / < 80
- Stage 1   = 130–139 / 80–89

128/80 → sys=128 < 130 → це **Elevated**, не Stage 1.

**Перевірити `getBPStatus()` для AHA гілки:**
```bash
grep -n -A 10 "AHA2017" src/features/pressure/norm.js
```

Переконатись що умова для Elevated:
```js
if (s >= 120 && s <= 129 && d < 80)
  return { label: t('n-bp-aha-elevated'), cls: 'badge-warn' };
```
Якщо умова неточна — виправити.

---

**Проблема 2 (JN-color):** Той самий запис 128/80 отримує
**сіру крапку** замість кольорової у журналі.

**Перевірити `getBPDotClass()` для AHA гілки:**
```bash
grep -n -A 10 "AHA2017" src/features/pressure/norm.js
```

Переконатись що для sys=128 при AHA повертається `'d-warn'` (жовтий),
а не `'d-ok'` (зелений/сірий).

Правильна логіка для AHA:
```js
if (std === 'AHA2017') {
  if (s < 90)  return 'd-hypo';
  if (s < 120) return 'd-ok';      // Normal
  if (s < 130) return 'd-warn';    // Elevated ← 128 має бути тут
  if (s < 140) return 'd-grade1';  // Stage 1
  if (s < 180) return 'd-bad';     // Stage 2
  return 'd-crit';                 // Crisis
}
```

### ✅ Перевірка після Блоку 1:
```bash
npm test
git diff --stat
grep -n "d-warn\|d-ok\|AHA" src/features/pressure/norm.js | head -20
```
**Чекати підтвердження.**

---

## БЛОК 2 — Блок "7 вим." та модал "14 дн.": узгодження
### Задача: UX-2

**Файл:** `src/features/analytics/trend-modal.js`

**Проблема А:** Блок на екрані підписаний **"7 ВИМ."**,
але модал показує **"СЕРЕДНІЙ 14 ДН."** з іншими цифрами.
Користувач бачить 129/79 в блоці, відкриває — там 131/80.

**Виправлення:**
Модал має показувати **ті самі 7 останніх вимірів** що і блок.

Знайти де в `trend-modal.js` визначається вікно даних:
```bash
grep -n "slice\|filter\|14\|last" src/features/analytics/trend-modal.js | head -15
```

Замінити `slice(0, 14)` або фільтр 14 днів на **7 останніх вимірів**:
```js
const data = all.slice(0, 7).reverse(); // 7 останніх, від старого до нового
```

Оновити label у модалі з "14 ДН." на "7 ВИМ." (через i18n ключ).

---

**Проблема Б:** Дати на графіку йдуть **від нового до старого**
(16 трав → 12 трав → 11 трав → 8 трав).

Стандарт — **від старого до нового** (зліва направо).

`.reverse()` у рядку вище вже вирішує це якщо `all` відсортований
від нового до старого (DESC). Перевірити що після reverse дати
йдуть хронологічно.

### ✅ Перевірка після Блоку 2:
```bash
npm test
git diff --stat
grep -n "slice\|reverse\|14" src/features/analytics/trend-modal.js
```
**Чекати підтвердження.**

---

## БЛОК 3 — Блок категорії: підпис та діапазони в модалі
### Задачі: UX-1, WHO-fix-3

### UX-1 · Додати підпис "Поточний вимір" до блоку категорії

**Файл:** `src/features/analytics/index.js`

**Проблема:** Блок "КАТЕГОРІЯ ТИСКУ (AHA 2017)" не пояснює
на основі якого виміру визначена категорія.
Користувач бачить 128/80 в хедері але не розуміє чому "HTN Ст. 1".

**Знайти блок категорії:**
```bash
grep -n "whoCategory\|КАТЕГОРІЯ\|t-who-cat" src/features/analytics/index.js | head -10
```

Додати під заголовком блоку дрібний підпис через i18n:
```js
// ui.uk.js: 'a-who-current': 'На основі останнього виміру'
// ui.ru.js: 'a-who-current': 'На основе последнего измерения'
```

---

### WHO-fix-3 · Діапазони AHA в модалі класифікації

**Файл:** `src/features/pressure/who.js`

**Проблема:** Модал "Класифікація тиску AHA 2017" показує
для Stage 1 діапазон **140–159/90–99** — це ESC Grade 1, не AHA.

AHA Stage 1 правильно: **130–139/80–89**

**Знайти:**
```bash
grep -n "140\|159\|ht1\|grade1" src/features/pressure/who.js | head -20
```

Переконатись що для `std === 'AHA2017'` контент модалу
використовує правильні AHA діапазони:
- Normal:    < 120/80
- Elevated:  120–129 / < 80
- Stage 1:   130–139 / 80–89
- Stage 2:   ≥ 140 / ≥ 90
- Crisis:    ≥ 180 / ≥ 120

Якщо модал бере один і той самий контент для ESC і AHA —
додати гілку для AHA з правильними текстами через i18n.

### ✅ Перевірка після Блоку 3:
```bash
npm test
git diff --stat
grep -n "a-who-current" src/i18n/ui.uk.js
grep -n "130.*139\|Stage 1" src/features/pressure/who.js
```
**Чекати підтвердження.**

---

## БЛОК 4 — Рекомендації: особиста норма
### Задачі: REC-2, REC-3

**Файл:** `src/features/analytics/recommendations.js`

**Проблема:** Коли тиск відповідає особистій нормі,
рекомендація показує **"Тиск в нормі!"** — звучить як медичний
висновок без контексту. Користувач не розуміє що це "норма
відносно особистого значення", а не за ESC/AHA.

---

### REC-2 · Змінити заголовок при активній особистій нормі

**Знайти:**
```bash
grep -n "okH\|ok_bp\|Тиск в норм\|n-bp-normal" src/features/analytics/recommendations.js | head -10
```

Якщо активна особиста норма (`getBPThresholds().personal === true`):
```js
// Заголовок:
// Було:  t('rec-ok-h')  → "Тиск в нормі!"
// Стало: t('rec-ok-personal-h') → "Тиск відповідає вашій нормі"

// ui.uk.js: 'rec-ok-personal-h': 'Тиск відповідає вашій нормі'
// ui.ru.js: 'rec-ok-personal-h': 'Давление соответствует вашей норме'
```

---

### REC-3 · Додати статус ESC/AHA в підрядок

Підрядок зараз: `"132/80 — відповідає нормі (особиста норма 130/80)"`

Має стати: `"132/80 · особиста норма: 130/80 · за ESC 2024: Підвищений"`

```js
// Отримати статус за стандартом:
const stdStatus = getBPStatus(aS, aD).label; // вже є, вже i18n

// Сформувати підрядок:
// uk: `${aS}/${aD} · особиста норма: ${ns}/${nd} · за ${stdLabel}: ${stdStatus}`
// Де stdLabel = state.settings.bpStandard === 'AHA2017' ? 'AHA 2017' : 'ESC 2024'
```

Додати i18n ключ для шаблону:
```js
// ui.uk.js: 'rec-ok-personal-s': '{bp} · особиста норма: {norm} · за {std}: {status}'
// ui.ru.js: 'rec-ok-personal-s': '{bp} · личная норма: {norm} · по {std}: {status}'
```

### ✅ Перевірка після Блоку 4:
```bash
npm test
git diff --stat
grep -n "rec-ok-personal" src/i18n/ui.uk.js
grep -n "rec-ok-personal" src/i18n/ui.ru.js
grep -n "personal" src/features/analytics/recommendations.js | head -10
```
**Чекати підтвердження.**

---

## БЛОК 5 — ІЗ тултіп: примітка про особисту норму
### Задача: IZ-warn

**Файл:** `src/features/analytics/health-score.js`
та/або `src/features/analytics/index.js`

**Проблема:** Коли встановлена особиста норма,
перемикач ESC/AHA **не впливає на розрахунок ІЗ**.
`getBPThresholds()` повертає особисту логіку одразу,
не доходячи до перевірки `bpStandard`.

Користувач перемикає ESC↔AHA і бачить той самий бал —
не розуміє чому.

**Виправлення:** Не змінювати логіку розрахунку.
Додати примітку в існуючий тултіп "?" блоку ІЗ.

**Знайти де рендериться тултіп ІЗ:**
```bash
grep -n "healthTooltip\|norm-mode\|hs-norm" src/features/analytics/index.js | head -10
grep -n "healthTooltip\|norm-mode\|hs-norm" src/features/analytics/health-score.js | head -10
```

**⚠️ ВАЖЛИВО:** Примітка показується **ТІЛЬКИ** коли особиста
норма реально заповнена в профілі. Якщо `normalSys`/`normalDia`
порожні — `bpPersonal` буде `false` і елемент має бути
**повністю прихований**. Не показувати за замовчуванням.

```js
// Знайти або створити елемент примітки в тултіпі:
const noteEl = document.getElementById('iz-personal-note');
if (!noteEl) return;

// ТІЛЬКИ якщо особиста норма активна:
if (d.bpPersonal === true) {
  const std = state.settings.bpStandard || 'ESC2024';
  const stdLabel = std === 'AHA2017' ? 'AHA 2017' : 'ESC 2024';
  noteEl.textContent = t('hs-personal-note')
    .replace('{std}', stdLabel)
    .replace('{status}', getBPStatus(d.avgSys, d.avgDia).label);
  noteEl.style.display = 'block';
} else {
  // Норма НЕ встановлена — приховати повністю
  noteEl.style.display = 'none';
}
```

Додати i18n ключі:
```js
// ui.uk.js:
'hs-personal-note': 'ℹ Розрахунок за особистою нормою. За {std}: {status}'
// ui.ru.js:
'hs-personal-note': 'ℹ Расчёт по личной норме. По {std}: {status}'
```

### ✅ Перевірка після Блоку 5:
```bash
npm test
git diff --stat
grep -n "hs-personal-note" src/i18n/ui.uk.js
grep -n "hs-personal-note" src/i18n/ui.ru.js
grep -n "bpPersonal" src/features/analytics/health-score.js
```
**Чекати підтвердження.**

---

## ФІНАЛ

Після підтвердження всіх 5 блоків:

```bash
npm test
git diff --stat
npm run version
grep "version" package.json
```

Потім — тільки після дозволу:
```bash
git add .
git commit -m "v5.3.23a: журнал AHA кольори, тренд 7 вим., WHO діапазони, рекомендації особиста норма, ІЗ тултіп"
git push origin main
```

---

## Що НЕ робити в цій сесії

- ❌ Не чіпати `pdf-report.js`, `csv.js`, `modal.js` — це наступне завдання
- ❌ Не змінювати логіку розрахунку ІЗ — тільки тултіп
- ❌ Не переробляти структуру модулів
- ❌ Не комітити без дозволу
- ❌ Не додавати нові тести без запиту

---

*HealthPro · Завдання A · v5.3.23 · 17.05.2026*
