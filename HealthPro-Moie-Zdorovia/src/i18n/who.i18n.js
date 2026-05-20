// WHO BP classification & info translations.

export const WHO_INFO_T = {
  uk: {
    optimal: {
      title: 'Оптимальний тиск (<120/80)',
      body:  'Оптимальний тиск — найнижчий ризик серцево-судинних захворювань. Підтримуйте здоровий спосіб життя.',
      advice: ['Регулярні виміри 2 рази/рік', 'Фізична активність 150 хв/тиждень', 'Здорове харчування — DASH-дієта'],
      links: [
        { l: 'МОЗ: 8 міфів про гіпертензію', u: 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' },
        { l: 'МОЗ: Правила виміру тиску',     u: 'https://moz.gov.ua/uk/jak-pravilno-vimirjuvati-tisk-i-koli-zvertatis-do-likarja' },
      ],
    },
    normal: {
      title: 'Нормальний тиск (120–129/80–84)',
      body:  'Нормальний рівень тиску. Ризик ускладнень мінімальний при дотриманні здорового способу життя.',
      advice: ['Вимірюйте тиск щорічно', 'Контроль ваги та харчування', 'Відмова від куріння'],
      links: [
        { l: 'МОЗ: Правила виміру тиску',     u: 'https://moz.gov.ua/uk/jak-pravilno-vimirjuvati-tisk-i-koli-zvertatis-do-likarja' },
        { l: 'Гіпертензія — ЦГЗУ МОЗ',        u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
      ],
    },
    'high-normal': {
      title: 'Високо-нормальний (130–139/85–89)',
      body:  'Тиск у верхній межі норми. Рекомендується спостереження та профілактичні заходи.',
      advice: ['Виміри 2 рази/день протягом 1 тижня', 'Обмежте сіль до 5 г/день', 'Зменшіть споживання алкоголю', 'Збільшіть фізичну активність'],
      links: [
        { l: 'МОЗ: 8 міфів про гіпертензію', u: 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' },
        { l: 'ЦГЗУ: Артеріальна гіпертензія', u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
      ],
    },
    ht1: {
      title: 'Гіпертензія І ступеня (140–159/90–99)',
      body:  'Перший ступінь гіпертонічної хвороби. Підвищений ризик інфаркту та інсульту. Необхідна консультація лікаря.',
      advice: ['Консультація терапевта/кардіолога', 'Виміри щодня вранці та ввечері', 'DASH-дієта (сіль <5 г/день)', 'Можливе призначення медикаментів'],
      links: [
        { l: 'МОЗ: 8 міфів про гіпертензію', u: 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' },
        { l: 'ВООЗ: Гіпертонія',              u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'Helsi — запис до лікаря',       u: 'https://helsi.me' },
      ],
    },
    ht2: {
      title: 'Гіпертензія ІІ ступеня (160–179/100–109)',
      body:  'Значно підвищений тиск. Серйозний ризик серцево-судинних ускладнень. Необхідне лікування.',
      advice: ['Негайна консультація кардіолога', 'Медикаментозна терапія обов\'язкова', 'Суворе обмеження солі та алкоголю', 'Регулярний моніторинг тиску'],
      links: [
        { l: 'ВООЗ: Гіпертонія',              u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'ЦГЗУ: Артеріальна гіпертензія', u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
        { l: 'Helsi',                          u: 'https://helsi.me' },
      ],
    },
    ht3: {
      title: 'Гіпертензія ІІІ ступеня (≥180/110)',
      body:  'Критичний рівень тиску! Необхідна невідкладна медична допомога.',
      advice: ['НЕГАЙНО викличте 103', 'Не займайтеся самолікуванням', 'Виміряйте тиск на обох руках', 'Сповістіть близьких'],
      links: [
        { l: 'Виклик 103',         u: 'tel:103' },
        { l: 'ВООЗ: Гіпертонія',   u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'Helsi',              u: 'https://helsi.me' },
      ],
    },
    // ── AHA 2017 специфічні варіанти (WHO-fix-3) ─────────────────────────────
    'aha_high-normal': {
      title: 'Elevated — AHA 2017 (120–129 / <80)',
      body:  'За AHA 2017: Elevated — систолічний 120–129 мм рт.ст. при діастолічному нижче 80. Підвищений ризик прогресування до гіпертонії. Медикаменти не призначаються — достатньо зміни способу життя.',
      advice: ['Виміри 2 рази/день 1 тиждень', 'Зменшіть сіль до 5 г/день', 'Збільшіть фізичну активність — 150 хв/тиждень', 'Обмежте алкоголь та відмовтеся від куріння'],
      links: [
        { l: 'AHA 2017: Guideline',             u: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065' },
        { l: 'ЦГЗУ: Артеріальна гіпертензія',  u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
      ],
    },
    aha_ht1: {
      title: 'Гіпертонія 1 ступеня — AHA 2017 (130–139 / 80–89)',
      body:  'За AHA 2017: Stage 1 — систолічний 130–139 АБО діастолічний 80–89 мм рт.ст. Підвищений ризик інфаркту та інсульту. Необхідна консультація лікаря щодо медикаментозного лікування.',
      advice: ['Консультація терапевта/кардіолога', 'Виміри щодня вранці та ввечері', 'DASH-дієта (сіль <5 г/день)', 'Можливе призначення медикаментів'],
      links: [
        { l: 'AHA 2017: Guideline',            u: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065' },
        { l: 'ВООЗ: Гіпертонія',               u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'Helsi — запис до лікаря',        u: 'https://helsi.me' },
      ],
    },
    aha_ht2: {
      title: 'Гіпертонія 2 ступеня — AHA 2017 (≥140 / ≥90)',
      body:  'За AHA 2017: Stage 2 — систолічний ≥140 АБО діастолічний ≥90 мм рт.ст. Значно підвищений тиск. Серйозний ризик серцево-судинних ускладнень. Необхідне медикаментозне лікування.',
      advice: ['Негайна консультація кардіолога', 'Медикаментозна терапія обов\'язкова', 'Суворе обмеження солі та алкоголю', 'Регулярний моніторинг тиску'],
      links: [
        { l: 'AHA 2017: Guideline',            u: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065' },
        { l: 'ВООЗ: Гіпертонія',               u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'Helsi',                          u: 'https://helsi.me' },
      ],
    },
  },
  ru: {
    optimal: {
      title: 'Оптимальное давление (<120/80)',
      body:  'Оптимальное давление — самый низкий риск сердечно-сосудистых заболеваний. Поддерживайте здоровый образ жизни.',
      advice: ['Регулярные измерения 2 раза/год', 'Физическая активность 150 мин/неделю', 'Здоровое питание — DASH-диета'],
      links: [
        { l: 'МОЗ: 8 мифов о гипертензии', u: 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' },
        { l: 'МОЗ: Правила измерения давления', u: 'https://moz.gov.ua/uk/jak-pravilno-vimirjuvati-tisk-i-koli-zvertatis-do-likarja' },
      ],
    },
    normal: {
      title: 'Нормальное давление (120–129/80–84)',
      body:  'Нормальный уровень давления. Риск осложнений минимальный при соблюдении здорового образа жизни.',
      advice: ['Измеряйте давление ежегодно', 'Контроль веса и питания', 'Отказ от курения'],
      links: [
        { l: 'МОЗ: Правила измерения давления', u: 'https://moz.gov.ua/uk/jak-pravilno-vimirjuvati-tisk-i-koli-zvertatis-do-likarja' },
        { l: 'Гипертензия — ЦГЗУ МОЗ', u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
      ],
    },
    'high-normal': {
      title: 'Высоко-нормальное (130–139/85–89)',
      body:  'Давление в верхней границе нормы. Рекомендуется наблюдение и профилактика.',
      advice: ['Измерения 2 раза/день в течение 1 недели', 'Ограничьте соль до 5 г/день', 'Уменьшите потребление алкоголя', 'Увеличьте физическую активность'],
      links: [
        { l: 'МОЗ: 8 мифов о гипертензии', u: 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' },
        { l: 'ЦГЗУ: Артериальная гипертензия', u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
      ],
    },
    ht1: {
      title: 'Гипертензия І степени (140–159/90–99)',
      body:  'Первая степень гипертонической болезни. Повышенный риск инфаркта и инсульта. Необходима консультация врача.',
      advice: ['Консультация терапевта/кардиолога', 'Измерения ежедневно утром и вечером', 'DASH-диета (соль <5 г/день)', 'Возможно назначение медикаментов'],
      links: [
        { l: 'МОЗ: 8 мифов о гипертензии', u: 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' },
        { l: 'ВОЗ: Гипертония',              u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'Helsi — запись к врачу',       u: 'https://helsi.me' },
      ],
    },
    ht2: {
      title: 'Гипертензия ІІ степени (160–179/100–109)',
      body:  'Значительно повышенное давление. Серьёзный риск сердечно-сосудистых осложнений. Необходимо лечение.',
      advice: ['Срочная консультация кардиолога', 'Медикаментозная терапия обязательна', 'Строгое ограничение соли и алкоголя', 'Регулярный мониторинг давления'],
      links: [
        { l: 'ВОЗ: Гипертония',              u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'ЦГЗУ: Артериальная гипертензия', u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
        { l: 'Helsi',                          u: 'https://helsi.me' },
      ],
    },
    ht3: {
      title: 'Гипертензия ІІІ степени (≥180/110)',
      body:  'Критический уровень давления! Необходима неотложная медицинская помощь.',
      advice: ['СРОЧНО вызовите 103', 'Не занимайтесь самолечением', 'Измерьте давление на обеих руках', 'Сообщите близким'],
      links: [
        { l: 'Вызов 103',         u: 'tel:103' },
        { l: 'ВОЗ: Гипертония',   u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'Helsi',              u: 'https://helsi.me' },
      ],
    },
    // ── AHA 2017 специфические варианты (WHO-fix-3) ───────────────────────────
    'aha_high-normal': {
      title: 'Elevated — AHA 2017 (120–129 / <80)',
      body:  'По AHA 2017: Elevated — систолическое 120–129 мм рт.ст. при диастолическом ниже 80. Повышенный риск прогрессирования до гипертонии. Медикаменты не назначаются — достаточно изменения образа жизни.',
      advice: ['Измерения 2 раза/день 1 неделю', 'Уменьшите соль до 5 г/день', 'Увеличьте физическую активность — 150 мин/неделю', 'Ограничьте алкоголь и откажитесь от курения'],
      links: [
        { l: 'AHA 2017: Guideline',            u: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065' },
        { l: 'ЦГЗУ: Артериальная гипертензия', u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
      ],
    },
    aha_ht1: {
      title: 'Гипертония 1 степени — AHA 2017 (130–139 / 80–89)',
      body:  'По AHA 2017: Stage 1 — систолическое 130–139 ИЛИ диастолическое 80–89 мм рт.ст. Повышенный риск инфаркта и инсульта. Необходима консультация врача по медикаментозному лечению.',
      advice: ['Консультация терапевта/кардиолога', 'Измерения ежедневно утром и вечером', 'DASH-диета (соль <5 г/день)', 'Возможно назначение медикаментов'],
      links: [
        { l: 'AHA 2017: Guideline',            u: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065' },
        { l: 'ВОЗ: Гипертония',                u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'Helsi — запись к врачу',         u: 'https://helsi.me' },
      ],
    },
    aha_ht2: {
      title: 'Гипертония 2 степени — AHA 2017 (≥140 / ≥90)',
      body:  'По AHA 2017: Stage 2 — систолическое ≥140 ИЛИ диастолическое ≥90 мм рт.ст. Значительно повышенное давление. Серьёзный риск сердечно-сосудистых осложнений. Необходимо медикаментозное лечение.',
      advice: ['Срочная консультация кардиолога', 'Медикаментозная терапия обязательна', 'Строгое ограничение соли и алкоголя', 'Регулярный мониторинг давления'],
      links: [
        { l: 'AHA 2017: Guideline',            u: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065' },
        { l: 'ВОЗ: Гипертония',                u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
        { l: 'Helsi',                          u: 'https://helsi.me' },
      ],
    },
  },
};
