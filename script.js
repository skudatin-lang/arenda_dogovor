// Основные переменные
let currentStep = 1;
let ocrText = '';
let currentFile = null;
let tesseractWorker = null;

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
    document.getElementById('contractDate').valueAsDate = today;
    
    // Инициализируем список проживающих
    initResidents();
    
    // Установим фокус на поле арендодателя
    document.getElementById('landlordName').focus();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Загрузка файлов
    const fileInput = document.getElementById('fileInput');
    const cameraInput = document.getElementById('cameraInput');
    
    fileInput.addEventListener('change', handleFileSelect);
    cameraInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop для предпросмотра
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        previewContainer.style.borderColor = '#764ba2';
    });
    
    previewContainer.addEventListener('dragleave', () => {
        previewContainer.style.borderColor = '#dee2e6';
    });
    
    previewContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        previewContainer.style.borderColor = '#dee2e6';
        
        if (e.dataTransfer.files.length) {
            handleFileSelect({ target: { files: e.dataTransfer.files } });
        }
    });
    
    // Автосохранение при вводе
    document.addEventListener('input', debounce(saveFormData, 1000));
}

// Открытие камеры
function openCamera() {
    document.getElementById('cameraInput').click();
}

// Обработка выбора файла
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    currentFile = file;
    
    if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите изображение (JPG, PNG)');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 10MB');
        return;
    }
    
    // Показать предпросмотр
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('imagePreview');
        const previewContainer = document.getElementById('previewContainer');
        
        preview.src = e.target.result;
        previewContainer.style.display = 'block';
        
        // Прокрутить к предпросмотру
        previewContainer.scrollIntoView({ behavior: 'smooth' });
        
        // Автоматически запустить распознавание через 1 секунду
        setTimeout(recognizeText, 1000);
    };
    
    reader.readAsDataURL(file);
}

// Очистка предпросмотра
function clearPreview() {
    document.getElementById('imagePreview').src = '';
    document.getElementById('previewContainer').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('cameraInput').value = '';
    currentFile = null;
}

// Распознавание текста с паспорта
async function recognizeText() {
    if (!currentFile) {
        alert('Сначала загрузите фото паспорта');
        return;
    }
    
    showLoading('Распознаем текст с паспорта...');
    
    try {
        // Используем Tesseract.js v2 для лучшей совместимости
        const worker = Tesseract.createWorker({
            logger: m => console.log('Tesseract:', m)
        });
        
        await worker.load();
        await worker.loadLanguage('rus');
        await worker.initialize('rus');
        
        // Распознаем текст
        const { data: { text } } = await worker.recognize(currentFile);
        ocrText = text;
        
        await worker.terminate();
        
        hideLoading();
        
        // Показываем распознанный текст
        showOCRModal(ocrText);
        
    } catch (error) {
        console.error('Ошибка распознавания:', error);
        hideLoading();
        alert('Не удалось распознать текст. Пожалуйста, введите данные вручную.');
    }
}

// Показать модальное окно с OCR результатом
function showOCRModal(text) {
    document.getElementById('ocrText').textContent = text;
    document.getElementById('ocrModal').classList.add('active');
}

// Закрыть OCR модальное окно
function closeOCRModal() {
    document.getElementById('ocrModal').classList.remove('active');
}

// Использовать данные из OCR для заполнения формы арендатора
function useOCRData() {
    if (!ocrText) return;
    
    // Парсим данные из текста (упрощенная версия)
    const lines = ocrText.split('\n');
    
    // Ищем ФИО (обычно самая длинная строка с русскими буквами)
    const nameCandidates = lines.filter(line => {
        const rusLetters = line.match(/[А-ЯЁ][а-яё]+/g);
        return rusLetters && rusLetters.length >= 2 && line.length > 10;
    });
    
    if (nameCandidates.length > 0) {
        // Берем самый длинный вариант
        const longestName = nameCandidates.reduce((a, b) => a.length > b.length ? a : b);
        document.getElementById('tenantName').value = longestName.trim();
    }
    
    // Ищем паспортные данные (формат: 4 цифры, пробел, 6 цифр)
    const passportMatch = ocrText.match(/(\d{4}\s?\d{6})/);
    if (passportMatch) {
        const passport = passportMatch[1].replace(/\s/g, '');
        if (passport.length === 10) {
            document.getElementById('tenantPassport').value = 
                passport.slice(0, 4) + ' ' + passport.slice(4);
        }
    }
    
    // Ищем код подразделения (формат: 123-456)
    const codeMatch = ocrText.match(/(\d{3}[-]\d{3})/);
    if (codeMatch) {
        document.getElementById('tenantDivisionCode').value = codeMatch[1];
    }
    
    closeOCRModal();
    goToStep(2);
}

// Пропустить OCR и перейти к ручному вводу
function skipToManual() {
    goToStep(2);
}

// Навигация по шагам
function goToStep(step) {
    // Скрыть все шаги
    document.querySelectorAll('.step-section').forEach(el => {
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
    const progress = ((currentStep - 1) / 2) * 100;
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
    const residentsContainer = document.getElementById('residentsContainer');
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
    const residentsContainer = document.getElementById('residentsContainer');
    const residentId = Date.now();
    
    const residentItem = document.createElement('div');
    residentItem.className = 'resident-item';
    residentItem.innerHTML = `
        <input type="text" placeholder="ФИО" value="${name}" 
               class="resident-name" oninput="saveFormData()">
        <input type="date" placeholder="Дата рождения" 
               class="resident-birthdate" oninput="saveFormData()">
        <button type="button" class="resident-remove" onclick="removeResident(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    residentsContainer.appendChild(residentItem);
}

// Удалить проживающего
function removeResident(button) {
    if (confirm('Удалить этого проживающего?')) {
        button.closest('.resident-item').remove();
        saveFormData();
    }
}

// Валидация и генерация договора
function validateAndGenerate() {
    // Проверка обязательных полей
    if (!validateForm()) {
        return;
    }
    
    // Генерация договора
    generateContract();
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
        'contractDate',
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
        if (!field.value.trim()) {
            const label = field.previousElementSibling?.textContent || field.placeholder;
            errors.push(label);
            field.style.borderColor = '#dc3545';
            
            // Показать подсказку
            if (!field.nextElementSibling?.classList.contains('hint')) {
                const hint = document.createElement('div');
                hint.className = 'hint';
                hint.textContent = 'Это поле обязательно для заполнения';
                hint.style.color = '#dc3545';
                field.parentNode.appendChild(hint);
            }
        } else {
            field.style.borderColor = '#e9ecef';
            
            // Удалить подсказку об ошибке
            const hint = field.nextElementSibling;
            if (hint && hint.classList.contains('hint') && hint.style.color === 'rgb(220, 53, 69)') {
                hint.remove();
            }
        }
    });
    
    if (errors.length > 0) {
        alert('Пожалуйста, заполните все обязательные поля:\n\n' + 
              errors.map(e => '• ' + e).join('\n'));
        
        // Прокрутить к первой ошибке
        const firstError = document.querySelector('input[style*="border-color: rgb(220, 53, 69)"]');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
        
        return false;
    }
    
    return true;
}

// Генерация договора
async function generateContract() {
    showLoading('Формируем договор...');
    
    try {
        // Собираем данные
        const data = collectFormData();
        
        // Создаем HTML договора
        const contractHTML = createContractHTML(data);
        
        // Отображаем договор
        document.getElementById('contractPreview').innerHTML = contractHTML;
        
        // Переходим к шагу 3
        setTimeout(() => {
            hideLoading();
            goToStep(3);
            
            // Прокрутить к началу договора
            document.getElementById('contractPreview').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
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
                birthdate: birthdate ? formatDate(birthdate) : ''
            });
        }
    });
    
    // Форматирование дат для договора
    const formatDateRU = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString('ru-RU', { month: 'long' });
        const year = date.getFullYear();
        return `${day} ${month} ${year} г.`;
    };
    
    // Форматирование дат для паспорта (кратко)
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
        
        if (n === 0) return 'ноль';
        
        // Тысячи
        if (n >= 1000) {
            const thousands = Math.floor(n / 1000);
            n %= 1000;
            if (thousands === 1) result += 'одна тысяча ';
            else if (thousands === 2) result += 'две тысячи ';
            else if (thousands < 5) result += numberToWords(thousands) + ' тысячи ';
            else result += numberToWords(thousands) + ' тысяч ';
        }
        
        // Сотни
        if (n >= 100) {
            const h = Math.floor(n / 100);
            result += hundreds[h] + ' ';
            n %= 100;
        }
        
        // Десятки
        if (n >= 20) {
            const t = Math.floor(n / 10);
            result += tens[t] + ' ';
            n %= 10;
        } else if (n >= 10) {
            result += teens[n - 10] + ' ';
            n = 0;
        }
        
        // Единицы
        if (n > 0) {
            result += units[n] + ' ';
        }
        
        return result.trim() + ' рублей';
    };
    
    // Получаем день из даты договора
    const contractDate = new Date(document.getElementById('contractDate').value);
    const contractDay = contractDate.getDate().toString().padStart(2, '0');
    const contractMonth = contractDate.toLocaleDateString('ru-RU', { month: 'long' });
    const contractYear = contractDate.getFullYear();
    
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
        
        // Условия аренды
        rentAmount: document.getElementById('rentAmount').value,
        rentAmountWords: numberToWords(document.getElementById('rentAmount').value),
        depositAmount: document.getElementById('depositAmount').value,
        depositAmountWords: numberToWords(document.getElementById('depositAmount').value),
        contractStart: formatDateRU(document.getElementById('contractStart').value),
        contractEnd: formatDateRU(document.getElementById('contractEnd').value),
        
        // Счетчики
        electricityCounter: document.getElementById('electricityCounter').value,
        hotWaterCounter: document.getElementById('hotWaterCounter').value,
        coldWaterCounter: document.getElementById('coldWaterCounter').value,
        
        // Проживающие
        residents: residents,
        residentsList: residents.map(r => `${r.name}${r.birthdate ? `, ${r.birthdate}` : ''}`).join('\n'),
        
        // Дата договора
        contractDay: contractDay,
        contractMonth: contractMonth,
        contractYear: contractYear,
        
        // Полная текущая дата
        currentDate: formatDateRU(document.getElementById('contractDate').value)
    };
}

// Создание HTML договора с правильной разбивкой на страницы
function createContractHTML(data) {
    // Создаем HTML для списка проживающих
    let residentsHTML = '';
    if (data.residents && data.residents.length > 0) {
        residentsHTML = data.residents.map((resident, index) => 
            `<p>${index + 1}. Ф.И.О., дата рождения <strong>${resident.name}</strong>${resident.birthdate ? `, ${resident.birthdate}` : ''}</p>`
        ).join('');
    }
    
    // Заменяем плейсхолдеры в данных
    let html = `
        <!-- Страница 1 -->
        <div class="page">
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #000;">
                <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">Договор СК-03</div>
                <div style="font-size: 12pt; margin-bottom: 5px;">аренды жилого помещения</div>
                <div style="font-size: 12pt; margin-top: 15px;">г. Москва «${data.contractDay}» ${data.contractMonth} ${data.contractYear} г.</div>
            </div>

            <div style="margin-bottom: 25px;">
                <p>Гр. <strong>${data.landlordName}</strong>, далее по тексту «Арендодатель», с одной стороны, и</p>
                <p><strong>${data.tenantName}</strong>, именуемый в дальнейшем «Арендатор», заключили настоящий Договор о нижеследующем:</p>
            </div>

            <div style="margin: 25px 0;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 15px; font-size: 12pt;">1. ПРЕДМЕТ ДОГОВОРА</div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">1.1.</span> Арендодатель за плату предоставляет Арендатору в аренду жилое помещение:
                    <div style="margin-left: 20px; margin-top: 10px; margin-bottom: 10px; font-weight: bold;">
                        «Квартира» общей площадью ${data.apartmentArea} кв.м., состоящее из ${data.roomsCount} комнат, расположенное по адресу: ${data.apartmentAddress}
                    </div>
                    телефон отсутствует
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">1.2.</span> Арендодатель является собственником жилого помещения на основании документов: ${data.basisDocument}
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">1.3.</span> Арендодатель подтверждает, что на момент подписания настоящего Договора указанное жилое помещение не продано, не подарено, не находится под залогом, не обременено другими договорами на срок аренды по настоящему Договору, в споре или под арестом не состоит, а также не отягощено другими обязательствами по отношению к третьим лицам, и к нему не существует претензий третьих лиц. Арендодатель гарантирует получение согласия всех совершеннолетних лиц, совместно с ним владеющих жилым помещением, на сдачу данного жилого помещения в аренду.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">1.4.</span> Срок аренды определяется <strong>с ${data.contractStart} по ${data.contractEnd}</strong> с пролонгацией по взаимному письменному согласию сторон.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">1.5.</span> В жилом помещении имеют право проживать лица, указанные в п.5 настоящего Договора.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">1.6.</span> Передача жилого помещения будет удостоверена обеими сторонами путем подписания акта приема-передачи жилого помещения по форме, указанной в Приложении № 1.
                </div>
            </div>
            
            <div style="margin-top: 50px; font-size: 10pt; color: #666; text-align: right;">Страница 1</div>
        </div>

        <!-- Страница 2 -->
        <div class="page">
            <div style="margin: 25px 0;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 15px; font-size: 12pt;">2. ПОРЯДОК ОПЛАТЫ ЖИЛОГО ПОМЕЩЕНИЯ</div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">2.1.</span> Размер оплаты за аренду жилого помещения устанавливается по соглашению сторон и составляет
                    <div style="margin-left: 20px; margin-top: 10px; margin-bottom: 10px; font-weight: bold;">
                        ${data.rentAmount} (${data.rentAmountWords}) рублей в месяц.
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">2.2.</span> Одностороннее изменение размера платы за аренду жилого помещения в течение всего срока действия Договора не допускается.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">2.3.</span> Оплата производится в следующем порядке:
                    <div style="margin-left: 20px; margin-top: 10px;">
                        <span style="font-weight: bold;">2.3.1.</span> При подписании данного Договора Арендодатель получает от Арендатора в качестве оплаты за аренду жилого помещения за 1 (один) месяц сумму, составляющую <strong>${data.rentAmount} (${data.rentAmountWords})</strong> рублей, а также сумму, составляющую <strong>${data.rentAmount} (${data.rentAmountWords})</strong> рублей в качестве оплаты за прошедший месяц.
                    </div>
                    <div style="margin-left: 20px; margin-top: 10px;">
                        <span style="font-weight: bold;">2.3.2.</span> Дальнейшая оплата производится (помесячно, поквартально) помесячно регулярно «31» числа, не позднее «01» числа.
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">2.4.</span> Факт осуществления платежей по настоящему Договору подтверждается Арендодателем путем выдачи расписок или чеков в получении денежных сумм от Арендатора или посредством заполнения графика платежей по Приложению № 3.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">2.5.</span> Электроэнергию оплачивает <strong>Арендатор</strong> (Арендодатель / Арендатор). Показания счетчика на дату передачи помещения в найм: <strong>${data.electricityCounter}</strong>.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">2.6.</span> Коммунальные услуги оплачивает <strong>Арендатор</strong> (Арендодатель / Арендатор).
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">2.7.</span> Абонентскую плату за интернет оплачивает <strong>Арендатор</strong> (Арендодатель / Арендатор).
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">2.8.</span> В случае наличия счетчиков горячей и холодной воды оплату за воду производит <strong>Арендатор</strong> (Арендодатель / Арендатор). Показания счетчиков на дату передачи помещения в найм: горячей воды <strong>${data.hotWaterCounter}</strong>, холодной воды <strong>${data.coldWaterCounter}</strong>.
                </div>
            </div>
            
            <div style="margin-top: 50px; font-size: 10pt; color: #666; text-align: right;">Страница 2</div>
        </div>

        <!-- Страница 3 -->
        <div class="page">
            <div style="margin: 25px 0;">
                <div style="font-weight: bold; margin-bottom: 40px; text-align: center;">
                    Арендодатель: _______________________   Арендатор: _______________________
                    <div style="font-weight: normal; font-size: 11pt; margin-top: 5px;">(подпись)</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">2.9.</span> С целью материального подтверждения обязательств по п.п. 4.2. и 4.3. настоящего Договора Арендатор передает Арендодателю страховой депозит в размере: <strong>${data.depositAmount} (${data.depositAmountWords})</strong> рублей.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">2.10.</span> По окончанию срока аренды, после передачи жилого помещения Арендатором Арендодателю и подтверждения отсутствия задолженности по междугородним телефонным переговорам, Арендодатель возвращает хранящийся у него страховой депозит за вычетом сумм, пошедших на оплату телефонных переговоров или других выплат согласно настоящему Договору.
                </div>
            </div>

            <div style="margin: 25px 0;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 15px; font-size: 12pt;">3. ПРАВА И ОБЯЗАННОСТИ АРЕНДОДАТЕЛЯ</div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">3.1.</span> Арендодатель обязан передать Арендатору жилое помещение, свободное от проживания в нем каких бы то ни было лиц, в состоянии, пригодном для проживания, а также с установленным в нем оборудованием, мебелью, иным имуществом (в случае наличия перечисленного), что отражается в Приложении № 1 к данному Договору, в исправном состоянии не позднее <strong>${data.contractStart}</strong>.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">3.2.</span> Арендодатель не в праве чинить препятствия Арендатору в правомерном пользовании жилым помещением.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">3.3.</span> Арендодатель в праве посещать сданное им в наем жилое помещение и производить его внешний осмотр в присутствии Арендатора по предварительному с ним соглашению, но не чаще <strong>2 (двух)</strong> раз в месяц.
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">3.4.</span> Арендодатель обязан осуществлять техобслуживание жилого помещения и оборудования в нем. Если Арендодатель окажется не в состоянии организовать необходимые ремонтные работы, Арендатор имеет право с письменного разрешения Арендодателя нанять третье лицо для выполнения таких работ или выполнить эти работы самостоятельно (по выбору Арендодателя) за цену, согласованную с Арендодателем с последующим вычетом стоимости таких работ из оплаты за аренду. В случае если неисправность или поломка любого из элементов или технических систем произошли по вине Арендатора, работы по устранению неисправностей и приведению жилого помещения в надлежащее состояние будут организованы и выполнены или Арендатором за свой счет, или Арендодателем за счет Арендатора (по выбору Арендатора).
                </div>
            </div>
            
            <div style="margin-top: 50px; font-size: 10pt; color: #666; text-align: right;">Страница 3</div>
        </div>

        <!-- Страница 4 -->
        <div class="page">
            <div style="margin: 25px 0;">
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">3.5.</span> Арендодатель не несет ответственности за действия Арендатора и за действия граждан, проживающих по п.5, перед третьими лицами за возможный ущерб, нанесенный третьим лицам по вине Арендатора.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">3.6.</span> В случае нанесения ущерба по вине Арендатора жилому помещению, мебели, оборудованию и иному имуществу, Арендодатель имеет право удержать согласованную с Арендатором в письменной форме сумму ущерба из страхового депозита.
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">3.7.</span> Ущерб жилому помещению, мебели, оборудованию и иному имуществу Арендодателя, нанесенный Арендатором, фиксируется сторонами в акте сдачи-приемки, подписываемом в соответствии с положением п. 4.10 настоящего Договора. В случае разногласий относительно факта причинения ущерба и его размера сторонами может быть назначена независимая экспертиза.
                </div>
            </div>

            <div style="margin: 25px 0;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 15px; font-size: 12pt;">4. ПРАВА И ОБЯЗАННОСТИ АРЕНДАТОРА</div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">4.1.</span> Арендатор обязан использовать жилое помещение только для проживания.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">4.2.</span> Арендатор обязан своевременно производить оплату Арендодателю за аренду жилого помещения в сроки и в порядке, установленным Договором, а также оплачивать счета за междугородние телефонные переговоры.
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">4.3.</span> Арендатор обязан обеспечивать сохранность жилого помещения, установленного в нем оборудования, мебели и иного имущества и поддерживать их в надлежащем состоянии.
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">4.4.</span> Арендатор обязан соблюдать нормы и правила пользования жилым помещением, в том числе правила пожарной безопасности и электробезопасности.
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">4.5.</span> Арендатор обязан своевременно и полно информировать Арендодателя по всем вопросам и обстоятельствам, имеющим отношение к жилому помещению, а также о получении почтовой корреспонденции, извещений и уведомлений в адрес Арендодателя.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">4.6.</span> Арендатор обязан освободить жилое помещение по истечении срока найма.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">4.7.</span> Арендатор не в праве заключать договора субаренды жилого помещения.
                </div>
            </div>
            
            <div style="margin-top: 50px; font-size: 10pt; color: #666; text-align: right;">Страница 4</div>
        </div>

        <!-- Страница 5 -->
        <div class="page">
            <div style="margin: 25px 0;">
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">4.8.</span> Арендатор не в праве заводить домашних животных в жилом помещении без письменного на то разрешения со стороны Арендодателя.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">4.9.</span> Арендатор не в праве производить переустройство и реконструкцию жилого помещения. Проводить ремонтные работы или осуществлять какие-либо изменения в жилом помещении Арендатор вправе только с письменного на то разрешения со стороны Арендодателя.
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">4.10.</span> Арендатор обязан по окончании срока аренды или в случае досрочного расторжения Договора вернуть Арендодателю в исправном состоянии с учетом естественного износа жилое помещение, установленное в нем оборудование, мебель и иное имущество, полученные им в соответствии с актом приема-передачи по Приложению № 1 путем оформления акта сдачи-приемки по Приложению № 2.
                </div>
                
                <div style="font-weight: bold; margin: 40px 0; text-align: center;">
                    Арендодатель: _______________________   Арендатор: _______________________
                    <div style="font-weight: normal; font-size: 11pt; margin-top: 5px;">(подпись)</div>
                </div>
            </div>

            <div style="margin: 25px 0;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 15px; font-size: 12pt;">5. ЛИЦА, ИМЕЮЩИЕ ПРАВО ПРОЖИВАТЬ В ЖИЛОМ ПОМЕЩЕНИИ</div>
                
                <div style="margin-bottom: 15px;">
                    Стороны договорились, что в жилом помещении могут проживать следующие лица:
                </div>
                
                <div style="margin-left: 20px;">
                    ${residentsHTML}
                </div>
            </div>
            
            <div style="margin-top: 50px; font-size: 10pt; color: #666; text-align: right;">Страница 5</div>
        </div>

        <!-- Страница 6 -->
        <div class="page">
            <div style="margin: 25px 0;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 15px; font-size: 12pt;">6. ОТВЕТСТВЕННОСТИ СТОРОН</div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">6.1.</span> За неисполнение или ненадлежащее исполнение условий данного Договора стороны несут ответственность в соответствии с действующим Законодательством РФ.
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">6.2.</span> Арендатор несет ответственность за соблюдение норм поведения в жилом помещении и за действия граждан, постоянно в нем проживающих, которые нарушают условия данного Договора.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">6.3.</span> Ликвидация последствий аварий, произошедших по вине Арендатора, производится за счет Арендатора.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">6.4.</span> Арендатор возмещает материальный ущерб, причиненный имуществу, указанному в Приложении № 1.
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">6.5.</span> Арендатор не несет ответственность за естественную амортизацию жилого помещения, установленного в нем оборудования, мебели и иного имущества.
                </div>
                
                <div style="margin-bottom: 15px; text-align: justify;">
                    <span style="font-weight: bold;">6.6.</span> Арендатор несет полную материальную ответственность за ущерб жилому помещению, установленному в нем оборудованию, мебели и иному имуществу, а также прилегающим помещениям, нанесенный по вине или грубой неосторожности Арендатора и/или лиц по п.5, его гостей, а также домашних животных.
                </div>
            </div>

            <div style="margin: 25px 0;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 15px; font-size: 12pt;">7. РАСТОРЖЕНИЕ ДОГОВОРА АРЕНДЫ ЖИЛОГО ПОМЕЩЕНИЯ</div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">7.1.</span> Договор может быть расторгнут по взаимному согласию сторон с письменным предупреждением за 30 (тридцать) дней до предполагаемой даты расторжения Договора.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">7.2.</span> Данный Договор может быть расторгнут по требованию Арендодателя в следующих случаях:
                    <div style="margin-left: 20px; margin-top: 10px;">
                        <span style="font-weight: bold;">7.2.1.</span> При несоблюдении Арендатором условий данного Договора.
                    </div>
                    <div style="margin-left: 20px; margin-top: 10px;">
                        <span style="font-weight: bold;">7.2.2.</span> При просрочке оплаты за аренду Арендатором более чем на один день.
                    </div>
                    <div style="margin-left: 20px; margin-top: 10px;">
                        <span style="font-weight: bold;">7.2.3.</span> При разрушении или порче жилого помещения, в случае причинения существенных убытков установленному в нем оборудованию, мебели и иному имуществу Арендатором или другими гражданами, за действия которых он отвечает.
                    </div>
                    <div style="margin-left: 20px; margin-top: 10px;">
                        <span style="font-weight: bold;">7.2.4.</span> Если Арендатор или другие граждане, за действия которых он отвечает, используют жилое помещение не по назначению или нарушают права и интересы соседей.
                    </div>
                    <div style="margin-left: 20px; margin-top: 10px;">
                        <span style="font-weight: bold;">7.2.5.</span> В случае досрочного расторжения настоящего Договора по вине или инициативе Арендатора страховой депозит ему не возвращается.
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <span style="font-weight: bold;">7.3.</span> Настоящий Договор может быть расторгнут по требованию любой из сторон в случае, если жилое помещение перестанет быть пригодным для постоянного проживания, а также в случае его аварийного состояния (по заключению РЭУ).
                </div>
            </div>
            
            <div style="margin-top: 50px; font-size: 10pt; color: #666; text-align: right;">Страница 6</div>
        </div>

        <!-- Страница 7 (последняя) -->
        <div class="page">
            <div style="margin: 25px 0;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 15px; font-size: 12pt;">8. ПРОЧИЕ УСЛОВИЯ</div>
                
                <div style="margin-bottom: 15px;">
                    8.1. Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой из сторон.
                </div>
                
                <div style="margin-bottom: 15px;">
                    8.2. Паспортные данные сторон:
                </div>
                
                <div style="margin: 15px 0; padding: 15px; border: 1px solid #ddd; background: #f9f9f9;">
                    <div style="font-weight: bold; margin-bottom: 10px;">АРЕНДОДАТЕЛЬ:</div>
                    <div>ФИО: ${data.landlordName}</div>
                    <div>Паспорт: серия/номер ${data.landlordPassport}</div>
                    <div>Выдан: ${data.landlordIssueDate}, ${data.landlordIssuedBy}</div>
                    <div>Код подразделения: ${data.landlordDivisionCode}</div>
                    <div>Зарегистрирован(а): ${data.landlordRegistration}</div>
                </div>
                
                <div style="margin: 15px 0; padding: 15px; border: 1px solid #ddd; background: #f9f9f9;">
                    <div style="font-weight: bold; margin-bottom: 10px;">АРЕНДАТОР:</div>
                    <div>ФИО: ${data.tenantName}</div>
                    <div>Паспорт: серия/номер ${data.tenantPassport}</div>
                    <div>Выдан: ${data.tenantIssueDate}, ${data.tenantIssuedBy}</div>
                    <div>Код подразделения: ${data.tenantDivisionCode}</div>
                    <div>Зарегистрирован(а): ${data.tenantRegistration}</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    8.3. Все изменения и дополнения к настоящему Договору действительны лишь в том случае, если они совершены в письменной форме и подписаны обеими сторонами.
                </div>
                
                <div style="margin-bottom: 15px;">
                    8.4. Во всем остальном, что не предусмотрено настоящим Договором, стороны руководствуются действующим законодательством Российской Федерации.
                </div>
            </div>

            <div style="margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="width: 45%; text-align: center;">
                    <div style="font-weight: bold;">Арендодатель:</div>
                    <div style="margin-top: 60px; border-top: 1px solid #000; padding-top: 5px;">
                        ${data.landlordName}
                    </div>
                    <div style="font-size: 11pt; margin-top: 5px;">(подпись)</div>
                </div>
                
                <div style="width: 45%; text-align: center;">
                    <div style="font-weight: bold;">Арендатор:</div>
                    <div style="margin-top: 60px; border-top: 1px solid #000; padding-top: 5px;">
                        ${data.tenantName}
                    </div>
                    <div style="font-size: 11pt; margin-top: 5px;">(подпись)</div>
                </div>
            </div>
            
            <div style="margin-top: 50px; font-size: 10pt; color: #666; text-align: right;">Страница 7</div>
        </div>
    `;
    
    return html;
}

// Скачать PDF
async function downloadPDF() {
    showLoading('Создаем PDF файл...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Получаем содержимое договора
        const contractElement = document.getElementById('contractPreview');
        const pages = contractElement.querySelectorAll('.page');
        
        // Для каждой страницы создаем отдельный PDF
        for (let i = 0; i < pages.length; i++) {
            if (i > 0) {
                doc.addPage(); // Добавляем новую страницу для каждой следующей страницы договора
            }
            
            // Клонируем страницу
            const pageClone = pages[i].cloneNode(true);
            
            // Создаем временный контейнер для рендеринга
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = '210mm';
            tempContainer.style.padding = '20mm';
            tempContainer.style.fontFamily = 'Times New Roman';
            tempContainer.style.fontSize = '12pt';
            tempContainer.style.lineHeight = '1.6';
            
            tempContainer.appendChild(pageClone);
            document.body.appendChild(tempContainer);
            
            // Используем html2canvas для конвертации
            const html2canvasScript = document.createElement('script');
            html2canvasScript.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
            document.head.appendChild(html2canvasScript);
            
            await new Promise(resolve => {
                html2canvasScript.onload = resolve;
            });
            
            const canvas = await html2canvas(pageClone, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: pageClone.offsetWidth,
                height: pageClone.offsetHeight
            });
            
            document.body.removeChild(tempContainer);
            document.head.removeChild(html2canvasScript);
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 190;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Добавляем изображение на страницу PDF
            doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        }
        
        // Сохраняем файл
        const fileName = `Договор_аренды_${document.getElementById('tenantName').value.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        
        hideLoading();
        
    } catch (error) {
        console.error('Ошибка создания PDF:', error);
        hideLoading();
        alert('Ошибка при создании PDF файла. Пожалуйста, используйте функцию печати.');
    }
}

// Печать договора
function printContract() {
    const printContent = document.getElementById('contractPreview').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Договор аренды - Печать</title>
            <style>
                body {
                    font-family: 'Times New Roman', serif;
                    font-size: 12pt;
                    line-height: 1.6;
                    margin: 0;
                    padding: 20mm;
                }
                .page {
                    page-break-after: always;
                    margin-bottom: 30mm;
                }
                .page:last-child {
                    page-break-after: auto;
                }
                @media print {
                    body { margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    @page {
                        margin: 20mm;
                    }
                }
                .print-controls {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: white;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    z-index: 1000;
                }
            </style>
        </head>
        <body>
            ${printContent}
            <div class="no-print print-controls">
                <button onclick="window.print()" style="padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px; font-weight: bold;">
                    🖨️ Печать
                </button>
                <button onclick="window.close()" style="padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    ✕ Закрыть
                </button>
            </div>
        </body>
        </html>
    `;
    
    window.focus();
    window.print();
    
    // Восстанавливаем оригинальное содержимое
    setTimeout(() => {
        document.body.innerHTML = originalContent;
        // Переинициализируем обработчики событий
        setupEventListeners();
    }, 1000);
}

// Вспомогательные функции
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

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
            contractDate: document.getElementById('contractDate').value,
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
        if (data.contractDate) document.getElementById('contractDate').value = data.contractDate;
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
            document.getElementById('residentsContainer').innerHTML = '';
            data.residents.forEach(resident => {
                addResident(resident.name);
                const items = document.querySelectorAll('.resident-item');
                const lastItem = items[items.length - 1];
                if (lastItem && resident.birthdate) {
                    lastItem.querySelector('.resident-birthdate').value = resident.birthdate;
                }
            });
        }
        
        // Восстанавливаем текущий шаг
        if (data.currentStep) {
            goToStep(data.currentStep);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}