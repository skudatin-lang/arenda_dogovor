// Основные переменные
let currentStep = 1;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
    loadSavedData();
    updateProgress();
});

// Инициализация приложения
function initApp() {
    // Установим даты по умолчанию
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 10); // 10 месяцев аренды как в примере
    
    document.getElementById('contractStart').value = formatDateForInput(today);
    document.getElementById('contractEnd').value = formatDateForInput(nextMonth);
    
    // Установим даты выдачи паспортов (примерно 5 лет назад)
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    document.getElementById('landlordIssueDate').value = formatDateForInput(fiveYearsAgo);
    document.getElementById('tenantIssueDate').value = formatDateForInput(fiveYearsAgo);
    
    // Инициализируем список проживающих
    initResidents();
}

// Форматирование даты для input type="date"
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Автосохранение при вводе
    document.addEventListener('input', debounce(saveFormData, 1000));
}

// Навигация по шагам
function goToStep(step) {
    // Скрыть все шаги
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Показать нужный шаг
    document.getElementById(`step${step}`).classList.add('active');
    
    currentStep = step;
    updateProgress();
    saveFormData();
    
    // Прокрутить к верху
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Обновление прогресс-бара
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progress = ((currentStep - 1) / 1) * 100; // Всего 2 шага (0 и 1)
    progressFill.style.width = `${progress}%`;
    
    // Обновить активные шаги
    document.querySelectorAll('.step[data-step]').forEach(el => {
        const stepNum = parseInt(el.dataset.step);
        if (stepNum <= currentStep) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

// Инициализация списка проживающих
function initResidents() {
    const residentsList = document.getElementById('residentsList');
    const defaultResidents = [
        'Адамбаев Абат',
        'Адамбаев Джамшут',
        'Хайтбаева Рубия',
        'Кутлимуратов Абаз',
        'Ибрагимов Мадер',
        'Хайтбаева Янгилжан'
    ];
    
    defaultResidents.forEach(name => {
        addResident(name);
    });
}

// Добавить проживающего
function addResident(name = '') {
    const residentsList = document.getElementById('residentsList');
    
    const residentItem = document.createElement('div');
    residentItem.className = 'resident-item';
    residentItem.innerHTML = `
        <input type="text" placeholder="ФИО" value="${name}" 
               oninput="saveFormData()" class="resident-name">
        <input type="date" placeholder="Дата рождения" 
               oninput="saveFormData()" class="resident-birthdate">
        <button type="button" class="resident-remove" onclick="removeResident(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    residentsList.appendChild(residentItem);
}

// Удалить проживающего
function removeResident(button) {
    if (confirm('Удалить этого проживающего?')) {
        button.closest('.resident-item').remove();
        saveFormData();
    }
}

// Генерация договора
function generateContract() {
    // Проверка обязательных полей
    if (!validateForm()) {
        return;
    }
    
    showLoading('Формируем договор...');
    
    try {
        // Собираем данные
        const data = collectFormData();
        
        // Создаем HTML договора
        const contractHTML = generateContractHTML(data);
        
        // Отображаем договор
        document.getElementById('contractPreview').innerHTML = contractHTML;
        
        // Переходим к шагу 2
        setTimeout(() => {
            hideLoading();
            goToStep(2);
        }, 500);
        
    } catch (error) {
        console.error('Ошибка генерации договора:', error);
        hideLoading();
        alert('Ошибка при формировании договора. Пожалуйста, проверьте введенные данные.');
    }
}

// Сбор данных формы
function collectFormData() {
    // Собираем проживающих
    const residents = [];
    document.querySelectorAll('.resident-item').forEach(item => {
        const name = item.querySelector('.resident-name').value;
        const birthdate = item.querySelector('.resident-birthdate').value;
        if (name.trim()) {
            residents.push({
                name: name.trim(),
                birthdate: birthdate ? formatDateRU(new Date(birthdate)) : ''
            });
        }
    });
    
    // Форматирование дат для договора
    const formatDateRU = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString('ru-RU', { month: 'long' });
        const year = date.getFullYear();
        return `${day} ${month} ${year} г.`;
    };
    
    // Форматирование дат для паспортных данных
    const formatDateShort = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };
    
    // Конвертация чисел в слова
    const numberToWords = (num) => {
        const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
        
        let result = '';
        let n = parseInt(num);
        
        if (isNaN(n) || n === 0) return 'ноль';
        
        // Тысячи
        if (n >= 1000) {
            const th = Math.floor(n / 1000);
            if (th === 1) result += 'одна тысяча ';
            else if (th === 2) result += 'две тысячи ';
            else if (th < 5) result += numberToWords(th) + ' тысячи ';
            else result += numberToWords(th) + ' тысяч ';
            n %= 1000;
        }
        
        // Сотни
        if (n >= 100) {
            const h = Math.floor(n / 100);
            result += hundreds[h] + ' ';
            n %= 100;
        }
        
        // Десятки и единицы
        if (n >= 20) {
            const t = Math.floor(n / 10);
            result += tens[t] + ' ';
            n %= 10;
        } else if (n >= 10) {
            result += teens[n - 10] + ' ';
            n = 0;
        }
        
        if (n > 0) {
            result += units[n] + ' ';
        }
        
        return result.trim() + ' рублей';
    };
    
    const currentDate = new Date();
    
    return {
        // Арендодатель
        landlordName: document.getElementById('landlordName').value,
        landlordPassport: document.getElementById('landlordPassport').value,
        landlordIssuedBy: document.getElementById('landlordIssuedBy').value,
        landlordIssueDate: formatDateShort(document.getElementById('landlordIssueDate').value),
        landlordDivisionCode: document.getElementById('landlordDivisionCode').value,
        landlordRegistration: document.getElementById('landlordRegistration').value,
        
        // Арендатор
        tenantName: document.getElementById('tenantName').value,
        tenantPassport: document.getElementById('tenantPassport').value,
        tenantIssuedBy: document.getElementById('tenantIssuedBy').value,
        tenantIssueDate: formatDateShort(document.getElementById('tenantIssueDate').value),
        tenantDivisionCode: document.getElementById('tenantDivisionCode').value,
        tenantRegistration: document.getElementById('tenantRegistration').value,
        
        // Данные квартиры
        apartmentAddress: document.getElementById('apartmentAddress').value,
        apartmentArea: document.getElementById('apartmentArea').value,
        roomsCount: document.getElementById('roomsCount').value,
        basisDocument: document.getElementById('basisDocument').value,
        
        // Условия
        rentAmount: document.getElementById('rentAmount').value,
        rentAmountWords: numberToWords(document.getElementById('rentAmount').value),
        depositAmount: document.getElementById('depositAmount').value,
        depositAmountWords: numberToWords(document.getElementById('depositAmount').value),
        contractStart: formatDateRU(new Date(document.getElementById('contractStart').value)),
        contractEnd: formatDateRU(new Date(document.getElementById('contractEnd').value)),
        
        // Счетчики
        electricityCounter: document.getElementById('electricityCounter').value || '_________',
        hotWaterCounter: document.getElementById('hotWaterCounter').value || '_________',
        coldWaterCounter: document.getElementById('coldWaterCounter').value || '_________',
        
        // Проживающие
        residents: residents,
        
        // Текущая дата
        currentDay: currentDate.getDate().toString().padStart(2, '0'),
        currentMonth: currentDate.toLocaleDateString('ru-RU', { month: 'long' }),
        currentYear: currentDate.getFullYear(),
        currentDate: formatDateRU(currentDate)
    };
}

// Валидация формы
function validateForm() {
    const requiredFields = [
        'landlordName',
        'landlordPassport',
        'landlordIssuedBy',
        'landlordIssueDate',
        'landlordDivisionCode',
        'landlordRegistration',
        'tenantName',
        'tenantPassport',
        'tenantIssuedBy',
        'tenantIssueDate',
        'tenantDivisionCode',
        'tenantRegistration',
        'apartmentAddress',
        'apartmentArea',
        'roomsCount',
        'basisDocument',
        'rentAmount',
        'depositAmount',
        'contractStart',
        'contractEnd',
        'electricityCounter',
        'hotWaterCounter',
        'coldWaterCounter'
    ];
    
    const errors = [];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field || !field.value.trim()) {
            const label = field.previousElementSibling ? field.previousElementSibling.textContent : field.placeholder;
            errors.push(label);
            if (field) {
                field.style.borderColor = '#dc3545';
            }
        } else if (field) {
            field.style.borderColor = '';
        }
    });
    
    // Проверка проживающих
    const residents = document.querySelectorAll('.resident-name');
    let hasResidents = false;
    residents.forEach(resident => {
        if (resident.value.trim()) {
            hasResidents = true;
        }
    });
    
    if (!hasResidents) {
        errors.push('Хотя бы один проживающий');
    }
    
    if (errors.length > 0) {
        alert('Пожалуйста, заполните все обязательные поля:\n\n• ' + errors.join('\n• '));
        return false;
    }
    
    return true;
}

// Генерация HTML договора с правильной разбивкой на страницы А4
function generateContractHTML(data) {
    // Создаем HTML для проживающих
    let residentsHTML = '';
    data.residents.forEach((resident, index) => {
        residentsHTML += `
            <div class="resident-line">
                ${index + 1}. Ф.И.О., дата рождения <strong>${resident.name}</strong>${resident.birthdate ? `, ${resident.birthdate}` : ''}
            </div>
        `;
    });
    
    return `
        <!-- Страница 1 -->
        <div class="page">
            <div class="contract-header">
                <div class="contract-title">Договор СК-03</div>
                <div class="contract-subtitle">аренды жилого помещения</div>
                <div class="contract-date">г. Москва «${data.currentDay}» ${data.currentMonth} ${data.currentYear} г.</div>
            </div>

            <div class="clause">
                Гр. <span class="underline bold">${data.landlordName}</span>, далее по тексту «Арендодатель», с одной стороны, и
            </div>
            <div class="clause">
                <span class="underline bold">${data.tenantName}</span>, именуемый в дальнейшем «Арендатор», заключили настоящий Договор о нижеследующем:
            </div>

            <div class="section">
                <div class="section-title">1. ПРЕДМЕТ ДОГОВОРА</div>
                
                <div class="clause">
                    <span class="clause-number">1.1.</span> Арендодатель за плату предоставляет Арендатору в аренду жилое помещение:
                    <div class="indent bold">
                        «Квартира» общей площадью ${data.apartmentArea} кв.м., состоящее из ${data.roomsCount} комнат, расположенное по адресу: ${data.apartmentAddress}
                    </div>
                    телефон отсутствует
                </div>
                
                <div class="clause">
                    <span class="clause-number">1.2.</span> Арендодатель является собственником жилого помещения на основании документов: ${data.basisDocument}
                </div>
                
                <div class="clause">
                    <span class="clause-number">1.3.</span> Арендодатель подтверждает, что на момент подписания настоящего Договора указанное жилое помещение не продано, не подарено, не находится под залогом, не обременено другими договорами на срок аренды по настоящему Договору, в споре или под арестом не состоит, а также не отягощено другими обязательствами по отношению к третьим лицам, и к нему не существует претензий третьих лиц. Арендодатель гарантирует получение согласия всех совершеннолетних лиц, совместно с ним владеющих жилым помещением, на сдачу данного жилого помещения в аренду.
                </div>
                
                <div class="clause">
                    <span class="clause-number">1.4.</span> Срок аренды определяется <span class="bold">с ${data.contractStart} по ${data.contractEnd}</span> с пролонгацией по взаимному письменному согласию сторон.
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature">
                    <div>Арендодатель:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
                <div class="signature">
                    <div>Арендатор:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
            </div>
            
            <div class="page-number">Страница 1</div>
        </div>

        <!-- Страница 2 -->
        <div class="page">
            <div class="clause">
                <span class="clause-number">1.5.</span> В жилом помещении имеют право проживать лица, указанные в п.5 настоящего Договора.
            </div>
            
            <div class="clause">
                <span class="clause-number">1.6.</span> Передача жилого помещения будет удостоверена обеими сторонами путем подписания акта приема-передачи жилого помещения по форме, указанной в Приложении № 1.
            </div>

            <div class="section">
                <div class="section-title">2. ПОРЯДОК ОПЛАТЫ ЖИЛОГО ПОМЕЩЕНИЯ</div>
                
                <div class="clause">
                    <span class="clause-number">2.1.</span> Размер оплаты за аренду жилого помещения устанавливается по соглашению сторон и составляет
                    <div class="indent bold">${data.rentAmount} (${data.rentAmountWords}) рублей в месяц.</div>
                </div>
                
                <div class="clause">
                    <span class="clause-number">2.2.</span> Одностороннее изменение размера платы за аренду жилого помещения в течение всего срока действия Договора не допускается.
                </div>
                
                <div class="clause">
                    <span class="clause-number">2.3.</span> Оплата производится в следующем порядке:
                    <div class="indent">
                        <span class="clause-number">2.3.1.</span> При подписании данного Договора Арендодатель получает от Арендатора в качестве оплаты за аренду жилого помещения за 1 (один) месяц сумму, составляющую <span class="bold">${data.rentAmount} (${data.rentAmountWords})</span> рублей, а также сумму, составляющую <span class="bold">${data.rentAmount} (${data.rentAmountWords})</span> рублей в качестве оплаты за прошедший месяц.
                    </div>
                    <div class="indent">
                        <span class="clause-number">2.3.2.</span> Дальнейшая оплата производится (помесячно, поквартально) помесячно регулярно «31» числа, не позднее «01» числа.
                    </div>
                </div>
                
                <div class="clause">
                    <span class="clause-number">2.4.</span> Факт осуществления платежей по настоящему Договору подтверждается Арендодателем путем выдачи расписок или чеков в получении денежных сумм от Арендатора или посредством заполнения графика платежей по Приложению № 3.
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature">
                    <div>Арендодатель:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
                <div class="signature">
                    <div>Арендатор:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
            </div>
            
            <div class="page-number">Страница 2</div>
        </div>

        <!-- Страница 3 -->
        <div class="page">
            <div class="clause">
                <span class="clause-number">2.5.</span> Электроэнергию оплачивает <span class="bold">Арендатор</span> (Арендодатель / Арендатор). Показания счетчика на дату передачи помещения в найм: <span class="underline">${data.electricityCounter}</span>.
            </div>
            
            <div class="clause">
                <span class="clause-number">2.6.</span> Коммунальные услуги оплачивает <span class="bold">Арендатор</span> (Арендодатель / Арендатор).
            </div>
            
            <div class="clause">
                <span class="clause-number">2.7.</span> Абонентскую плату за интернет оплачивает <span class="bold">Арендатор</span> (Арендодатель / Арендатор).
            </div>
            
            <div class="clause">
                <span class="clause-number">2.8.</span> В случае наличия счетчиков горячей и холодной воды оплату за воду производит <span class="bold">Арендатор</span> (Арендодатель / Арендатор). Показания счетчиков на дату передачи помещения в найм: горячей воды <span class="underline">${data.hotWaterCounter}</span>, холодной воды <span class="underline">${data.coldWaterCounter}</span>.
            </div>
            
            <div class="clause">
                <span class="clause-number">2.9.</span> С целью материального подтверждения обязательств по п.п. 4.2. и 4.3. настоящего Договора Арендатор передает Арендодателю страховой депозит в размере: <span class="bold">${data.depositAmount} (${data.depositAmountWords})</span> рублей.
            </div>
            
            <div class="clause">
                <span class="clause-number">2.10.</span> По окончанию срока аренды, после передачи жилого помещения Арендатором Арендодателю и подтверждения отсутствия задолженности по междугородним телефонным переговорам, Арендодатель возвращает хранящийся у него страховой депозит за вычетом сумм, пошедших на оплату телефонных переговоров или других выплат согласно настоящему Договору.
            </div>
            
            <div class="signature-block">
                <div class="signature">
                    <div>Арендодатель:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
                <div class="signature">
                    <div>Арендатор:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
            </div>
            
            <div class="page-number">Страница 3</div>
        </div>

        <!-- Страница 4 -->
        <div class="page">
            <div class="section">
                <div class="section-title">3. ПРАВА И ОБЯЗАННОСТИ АРЕНДОДАТЕЛЯ</div>
                
                <div class="clause">
                    <span class="clause-number">3.1.</span> Арендодатель обязан передать Арендатору жилое помещение, свободное от проживания в нем каких бы то ни было лиц, в состоянии, пригодном для проживания, а также с установленным в нем оборудованием, мебелью, иным имуществом (в случае наличия перечисленного), что отражается в Приложении № 1 к данному Договору, в исправном состоянии не позднее <span class="bold">${data.contractStart}</span>.
                </div>
                
                <div class="clause">
                    <span class="clause-number">3.2.</span> Арендодатель не в праве чинить препятствия Арендатору в правомерном пользовании жилым помещением.
                </div>
                
                <div class="clause">
                    <span class="clause-number">3.3.</span> Арендодатель в праве посещать сданное им в наем жилое помещение и производить его внешний осмотр в присутствии Арендатора по предварительному с ним соглашению, но не чаще <span class="bold">2 (двух)</span> раз в месяц.
                </div>
                
                <div class="clause">
                    <span class="clause-number">3.4.</span> Арендодатель обязан осуществлять техобслуживание жилого помещения и оборудования в нем. Если Арендодатель окажется не в состоянии организовать необходимые ремонтные работы, Арендатор имеет право с письменного разрешения Арендодателя нанять третье лицо для выполнения таких работ или выполнить эти работы самостоятельно (по выбору Арендодателя) за цену, согласованную с Арендодателем с последующим вычетом стоимости таких работ из оплаты за аренду. В случае если неисправность или поломка любого из элементов или технических систем произошли по вине Арендатора, работы по устранению неисправностей и приведению жилого помещения в надлежащее состояние будут организованы и выполнены или Арендатором за свой счет, или Арендодателем за счет Арендатора (по выбору Арендатора).
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature">
                    <div>Арендодатель:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
                <div class="signature">
                    <div>Арендатор:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
            </div>
            
            <div class="page-number">Страница 4</div>
        </div>

        <!-- Страница 5 -->
        <div class="page">
            <div class="clause">
                <span class="clause-number">3.5.</span> Арендодатель не несет ответственности за действия Арендатора и за действия граждан, проживающих по п.5, перед третьими лицами за возможный ущерб, нанесенный третьим лицам по вине Арендатора.
            </div>
            
            <div class="clause">
                <span class="clause-number">3.6.</span> В случае нанесения ущерба по вине Арендатора жилому помещению, мебели, оборудованию и иному имуществу, Арендодатель имеет право удержать согласованную с Арендатором в письменной форме сумму ущерба из страхового депозита.
            </div>
            
            <div class="clause">
                <span class="clause-number">3.7.</span> Ущерб жилому помещению, мебели, оборудованию и иному имуществу Арендодателя, нанесенный Арендатором, фиксируется сторонами в акте сдачи-приемки, подписываемом в соответствии с положением п. 4.10 настоящего Договора. В случае разногласий относительно факта причинения ущерба и его размера сторонами может быть назначена независимая экспертиза.
            </div>

            <div class="section">
                <div class="section-title">4. ПРАВА И ОБЯЗАННОСТИ АРЕНДАТОРА</div>
                
                <div class="clause">
                    <span class="clause-number">4.1.</span> Арендатор обязан использовать жилое помещение только для проживания.
                </div>
                
                <div class="clause">
                    <span class="clause-number">4.2.</span> Арендатор обязан своевременно производить оплату Арендодателю за аренду жилого помещения в сроки и в порядке, установленным Договором, а также оплачивать счета за междугородние телефонные переговоры.
                </div>
                
                <div class="clause">
                    <span class="clause-number">4.3.</span> Арендатор обязан обеспечивать сохранность жилого помещения, установленного в нем оборудования, мебели и иного имущества и поддерживать их в надлежащем состоянии.
                </div>
                
                <div class="clause">
                    <span class="clause-number">4.4.</span> Арендатор обязан соблюдать нормы и правила пользования жилым помещением, в том числе правила пожарной безопасности и электробезопасности.
                </div>
                
                <div class="clause">
                    <span class="clause-number">4.5.</span> Арендатор обязан своевременно и полно информировать Арендодателя по всем вопросам и обстоятельствам, имеющим отношение к жилому помещению, а также о получении почтовой корреспонденции, извещений и уведомлений в адрес Арендодателя.
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature">
                    <div>Арендодатель:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
                <div class="signature">
                    <div>Арендатор:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
            </div>
            
            <div class="page-number">Страница 5</div>
        </div>

        <!-- Страница 6 -->
        <div class="page">
            <div class="clause">
                <span class="clause-number">4.6.</span> Арендатор обязан освободить жилое помещение по истечении срока найма.
            </div>
            
            <div class="clause">
                <span class="clause-number">4.7.</span> Арендатор не в праве заключать договора субаренды жилого помещения.
            </div>
            
            <div class="clause">
                <span class="clause-number">4.8.</span> Арендатор не в праве заводить домашних животных в жилом помещении без письменного на то разрешения со стороны Арендодателя.
            </div>
            
            <div class="clause">
                <span class="clause-number">4.9.</span> Арендатор не в праве производить переустройство и реконструкцию жилого помещения. Проводить ремонтные работы или осуществлять какие-либо изменения в жилом помещении Арендатор вправе только с письменного на то разрешения со стороны Арендодателя.
            </div>
            
            <div class="clause">
                <span class="clause-number">4.10.</span> Арендатор обязан по окончании срока аренды или в случае досрочного расторжения Договора вернуть Арендодателю в исправном состоянии с учетом естественного износа жилое помещение, установленное в нем оборудование, мебель и иное имущество, полученные им в соответствии с актом приема-передачи по Приложению № 1 путем оформления акта сдачи-приемки по Приложению № 2.
            </div>

            <div class="section">
                <div class="section-title">5. ЛИЦА, ИМЕЮЩИЕ ПРАВО ПРОЖИВАТЬ В ЖИЛОМ ПОМЕЩЕНИИ</div>
                
                <div class="clause">
                    Стороны договорились, что в жилом помещении могут проживать следующие лица:
                </div>
                
                <div class="indent">
                    ${residentsHTML}
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature">
                    <div>Арендодатель:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
                <div class="signature">
                    <div>Арендатор:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
            </div>
            
            <div class="page-number">Страница 6</div>
        </div>

        <!-- Страница 7 -->
        <div class="page">
            <div class="section">
                <div class="section-title">6. ОТВЕТСТВЕННОСТИ СТОРОН</div>
                
                <div class="clause">
                    <span class="clause-number">6.1.</span> За неисполнение или ненадлежащее исполнение условий данного Договора стороны несут ответственность в соответствии с действующим Законодательством РФ.
                </div>
                
                <div class="clause">
                    <span class="clause-number">6.2.</span> Арендатор несет ответственность за соблюдение норм поведения в жилом помещении и за действия граждан, постоянно в нем проживающих, которые нарушают условия данного Договора.
                </div>
                
                <div class="clause">
                    <span class="clause-number">6.3.</span> Ликвидация последствий аварий, произошедших по вине Арендатора, производится за счет Арендатора.
                </div>
                
                <div class="clause">
                    <span class="clause-number">6.4.</span> Арендатор возмещает материальный ущерб, причиненный имуществу, указанному в Приложении № 1.
                </div>
                
                <div class="clause">
                    <span class="clause-number">6.5.</span> Арендатор не несет ответственность за естественную амортизацию жилого помещения, установленного в нем оборудования, мебели и иного имущества.
                </div>
                
                <div class="clause">
                    <span class="clause-number">6.6.</span> Арендатор несет полную материальную ответственность за ущерб жилому помещению, установленному в нем оборудованию, мебели и иному имуществу, а также прилегающим помещениям, нанесенный по вине или грубой неосторожности Арендатора и/или лиц по п.5, его гостей, а также домашних животных.
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">7. РАСТОРЖЕНИЕ ДОГОВОРА АРЕНДЫ ЖИЛОГО ПОМЕЩЕНИЯ</div>
                
                <div class="clause">
                    <span class="clause-number">7.1.</span> Договор может быть расторгнут по взаимному согласию сторон с письменным предупреждением за 30 (тридцать) дней до предполагаемой даты расторжения Договора.
                </div>
                
                <div class="clause">
                    <span class="clause-number">7.2.</span> Данный Договор может быть расторгнут по требованию Арендодателя в следующих случаях:
                    <div class="indent">
                        <span class="clause-number">7.2.1.</span> При несоблюдении Арендатором условий данного Договора.
                    </div>
                    <div class="indent">
                        <span class="clause-number">7.2.2.</span> При просрочке оплаты за аренду Арендатором более чем на один день.
                    </div>
                    <div class="indent">
                        <span class="clause-number">7.2.3.</span> При разрушении или порче жилого помещения, в случае причинения существенных убытков установленному в нем оборудованию, мебели и иному имуществу Арендатором или другими гражданами, за действия которых он отвечает.
                    </div>
                    <div class="indent">
                        <span class="clause-number">7.2.4.</span> Если Арендатор или другие граждане, за действия которых он отвечает, используют жилое помещение не по назначению или нарушают права и интересы соседей.
                    </div>
                    <div class="indent">
                        <span class="clause-number">7.2.5.</span> В случае досрочного расторжения настоящего Договора по вине или инициативе Арендатора страховой депозит ему не возвращается.
                    </div>
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature">
                    <div>Арендодатель:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
                <div class="signature">
                    <div>Арендатор:</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
            </div>
            
            <div class="page-number">Страница 7</div>
        </div>

        <!-- Страница 8 -->
        <div class="page">
            <div class="clause">
                <span class="clause-number">7.3.</span> Настоящий Договор может быть расторгнут по требованию любой из сторон в случае, если жилое помещение перестанет быть пригодным для постоянного проживания, а также в случае его аварийного состояния (по заключению РЭУ).
            </div>

            <div class="section">
                <div class="section-title">8. ПРОЧИЕ УСЛОВИЯ</div>
                
                <div class="clause">
                    8.1. Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой из сторон.
                </div>
                
                <div class="clause">
                    8.2. Паспортные данные сторон:
                </div>
                
                <div class="passport-data">
                    <div class="bold">АРЕНДОДАТЕЛЬ:</div>
                    <div>ФИО: ${data.landlordName}</div>
                    <div>Паспорт: ${data.landlordPassport}</div>
                    <div>Выдан: ${data.landlordIssueDate}, ${data.landlordIssuedBy}</div>
                    <div>Код подразделения: ${data.landlordDivisionCode}</div>
                    <div>Зарегистрирован(а): ${data.landlordRegistration}</div>
                </div>
                
                <div class="passport-data">
                    <div class="bold">АРЕНДАТОР:</div>
                    <div>ФИО: ${data.tenantName}</div>
                    <div>Паспорт: ${data.tenantPassport}</div>
                    <div>Выдан: ${data.tenantIssueDate}, ${data.tenantIssuedBy}</div>
                    <div>Код подразделения: ${data.tenantDivisionCode}</div>
                    <div>Зарегистрирован(а): ${data.tenantRegistration}</div>
                </div>
            </div>
            
            <div class="signature-block">
                <div class="signature">
                    <div><strong>Арендодатель:</strong></div>
                    <div>___________________________</div>
                    <div>${data.landlordName}</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
                <div class="signature">
                    <div><strong>Арендатор:</strong></div>
                    <div>___________________________</div>
                    <div>${data.tenantName}</div>
                    <div class="signature-line"></div>
                    <div>(подпись)</div>
                </div>
            </div>
            
            <div class="page-number">Страница 8</div>
        </div>
    `;
}

// Скачать PDF
async function downloadPDF() {
    showLoading('Создаем PDF...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true
        });
        
        // Получаем содержимое договора
        const contractElement = document.getElementById('contractPreview');
        
        // Конвертируем в изображение
        const canvas = await html2canvas(contractElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Добавляем изображение в PDF
        doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        
        // Сохраняем файл
        const fileName = `Договор_аренды_${document.getElementById('tenantName').value.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        
        hideLoading();
        
    } catch (error) {
        console.error('Ошибка создания PDF:', error);
        hideLoading();
        alert('Ошибка при создании PDF. Пожалуйста, используйте функцию печати.');
    }
}

// Печать договора
function printContract() {
    const printContent = document.getElementById('contractPreview').innerHTML;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Договор аренды - Печать</title>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: 'Times New Roman', serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    margin: 0;
                    padding: 0;
                }
                .page {
                    page-break-after: always;
                    padding: 20mm;
                    min-height: 297mm;
                    position: relative;
                }
                .page:last-child {
                    page-break-after: auto;
                }
                .contract-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #000;
                }
                .contract-title {
                    font-size: 16pt;
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                }
                .section-title {
                    font-weight: bold;
                    text-decoration: underline;
                    margin: 25px 0 15px;
                    font-size: 12pt;
                }
                .clause {
                    margin-bottom: 12px;
                    text-align: justify;
                    font-size: 11pt;
                }
                .clause-number {
                    font-weight: bold;
                }
                .signature-block {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    position: absolute;
                    bottom: 30mm;
                    left: 20mm;
                    right: 20mm;
                }
                .signature {
                    width: 45%;
                    text-align: center;
                }
                .signature-line {
                    border-top: 1px solid #000;
                    margin-top: 40px;
                    width: 100%;
                }
                .underline {
                    text-decoration: underline;
                }
                .bold {
                    font-weight: bold;
                }
                .indent {
                    padding-left: 20px;
                    margin: 5px 0;
                }
                .page-number {
                    position: absolute;
                    bottom: 10mm;
                    right: 20mm;
                    font-size: 10pt;
                    color: #666;
                }
                .passport-data {
                    margin: 15px 0;
                    padding: 10px;
                    border: 1px solid #ddd;
                    background: #f9f9f9;
                }
                @media print {
                    .no-print { display: none !important; }
                    @page { margin: 20mm; }
                }
            </style>
        </head>
        <body>
            ${printContent}
            <div class="no-print" style="position: fixed; bottom: 20px; right: 20px; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    Печать
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Закрыть
                </button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Автопечать через 1 секунду
    setTimeout(() => {
        printWindow.print();
    }, 1000);
}

// Вспомогательные функции
function showLoading(message) {
    const modal = document.getElementById('loadingModal');
    const text = document.getElementById('loadingText');
    text.textContent = message;
    modal.classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingModal').classList.remove('active');
}

// Debounce для автосохранения
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Сохранение данных в localStorage
function saveFormData() {
    try {
        const data = {
            // Данные арендодателя
            landlordName: document.getElementById('landlordName').value,
            landlordPassport: document.getElementById('landlordPassport').value,
            landlordIssuedBy: document.getElementById('landlordIssuedBy').value,
            landlordIssueDate: document.getElementById('landlordIssueDate').value,
            landlordDivisionCode: document.getElementById('landlordDivisionCode').value,
            landlordRegistration: document.getElementById('landlordRegistration').value,
            
            // Данные арендатора
            tenantName: document.getElementById('tenantName').value,
            tenantPassport: document.getElementById('tenantPassport').value,
            tenantIssuedBy: document.getElementById('tenantIssuedBy').value,
            tenantIssueDate: document.getElementById('tenantIssueDate').value,
            tenantDivisionCode: document.getElementById('tenantDivisionCode').value,
            tenantRegistration: document.getElementById('tenantRegistration').value,
            
            // Данные квартиры
            apartmentAddress: document.getElementById('apartmentAddress').value,
            apartmentArea: document.getElementById('apartmentArea').value,
            roomsCount: document.getElementById('roomsCount').value,
            basisDocument: document.getElementById('basisDocument').value,
            
            // Условия
            rentAmount: document.getElementById('rentAmount').value,
            depositAmount: document.getElementById('depositAmount').value,
            contractStart: document.getElementById('contractStart').value,
            contractEnd: document.getElementById('contractEnd').value,
            
            // Счетчики
            electricityCounter: document.getElementById('electricityCounter').value,
            hotWaterCounter: document.getElementById('hotWaterCounter').value,
            coldWaterCounter: document.getElementById('coldWaterCounter').value,
            
            // Проживающие
            residents: Array.from(document.querySelectorAll('.resident-item')).map(item => ({
                name: item.querySelector('.resident-name').value,
                birthdate: item.querySelector('.resident-birthdate').value
            })),
            
            // Текущий шаг
            currentStep: currentStep
        };
        
        localStorage.setItem('rentalContractData', JSON.stringify(data));
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// Загрузка сохраненных данных
function loadSavedData() {
    try {
        const saved = localStorage.getItem('rentalContractData');
        if (!saved) return;
        
        const data = JSON.parse(saved);
        
        // Восстанавливаем данные арендодателя
        if (data.landlordName) document.getElementById('landlordName').value = data.landlordName;
        if (data.landlordPassport) document.getElementById('landlordPassport').value = data.landlordPassport;
        if (data.landlordIssuedBy) document.getElementById('landlordIssuedBy').value = data.landlordIssuedBy;
        if (data.landlordIssueDate) document.getElementById('landlordIssueDate').value = data.landlordIssueDate;
        if (data.landlordDivisionCode) document.getElementById('landlordDivisionCode').value = data.landlordDivisionCode;
        if (data.landlordRegistration) document.getElementById('landlordRegistration').value = data.landlordRegistration;
        
        // Восстанавливаем данные арендатора
        if (data.tenantName) document.getElementById('tenantName').value = data.tenantName;
        if (data.tenantPassport) document.getElementById('tenantPassport').value = data.tenantPassport;
        if (data.tenantIssuedBy) document.getElementById('tenantIssuedBy').value = data.tenantIssuedBy;
        if (data.tenantIssueDate) document.getElementById('tenantIssueDate').value = data.tenantIssueDate;
        if (data.tenantDivisionCode) document.getElementById('tenantDivisionCode').value = data.tenantDivisionCode;
        if (data.tenantRegistration) document.getElementById('tenantRegistration').value = data.tenantRegistration;
        
        // Восстанавливаем данные квартиры
        if (data.apartmentAddress) document.getElementById('apartmentAddress').value = data.apartmentAddress;
        if (data.apartmentArea) document.getElementById('apartmentArea').value = data.apartmentArea;
        if (data.roomsCount) document.getElementById('roomsCount').value = data.roomsCount;
        if (data.basisDocument) document.getElementById('basisDocument').value = data.basisDocument;
        
        // Восстанавливаем условия
        if (data.rentAmount) document.getElementById('rentAmount').value = data.rentAmount;
        if (data.depositAmount) document.getElementById('depositAmount').value = data.depositAmount;
        if (data.contractStart) document.getElementById('contractStart').value = data.contractStart;
        if (data.contractEnd) document.getElementById('contractEnd').value = data.contractEnd;
        
        // Восстанавливаем счетчики
        if (data.electricityCounter) document.getElementById('electricityCounter').value = data.electricityCounter;
        if (data.hotWaterCounter) document.getElementById('hotWaterCounter').value = data.hotWaterCounter;
        if (data.coldWaterCounter) document.getElementById('coldWaterCounter').value = data.coldWaterCounter;
        
        // Восстанавливаем проживающих
        if (data.residents && data.residents.length > 0) {
            document.getElementById('residentsList').innerHTML = '';
            data.residents.forEach(resident => {
                addResident(resident.name);
                const items = document.querySelectorAll('.resident-item');
                const lastItem = items[items.length - 1];
                if (lastItem && resident.birthdate) {
                    lastItem.querySelector('.resident-birthdate').value = resident.birthdate;
                }
            });
        } else {
            initResidents();
        }
        
        // Восстанавливаем текущий шаг
        if (data.currentStep) {
            goToStep(data.currentStep);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}