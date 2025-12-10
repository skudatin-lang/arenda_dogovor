// Основные переменные
let currentStep = 1;
let extractedData = {};
let tesseractWorker = null;
let isTesseractReady = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Настройка загрузки файлов
    setupFileUpload();
    
    // Загрузка сохраненных данных, если есть
    loadSavedData();
    
    // Инициализация Tesseract в фоне
    initTesseract();
    
    // Устанавливаем текущую дату в форму
    setCurrentDate();
    
    // Автосохранение при изменении полей
    setupAutoSave();
});

// Установка текущей даты
function setCurrentDate() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthLater = new Date(now.setMonth(now.getMonth() + 1)).toISOString().split('T')[0];
    
    document.getElementById('contractStart').value = today;
    document.getElementById('contractEnd').value = monthLater;
}

// Настройка загрузки файлов
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('passportInput');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#2980b9';
        uploadArea.style.background = '#e3f2fd';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#3498db';
        uploadArea.style.background = '#f8fafc';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#3498db';
        uploadArea.style.background = '#f8fafc';
        
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

// Обработка выбранного файла
async function handleFileSelect(file) {
    if (!file.type.match('image.*') && !file.type.match('application/pdf')) {
        alert('Пожалуйста, выберите изображение (JPG, PNG) или PDF файл');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 10MB');
        return;
    }
    
    showLoading('Загружаем изображение...');
    
    try {
        const imageUrl = await readFileAsDataURL(file);
        const preview = document.getElementById('passportPreview');
        const previewContainer = document.getElementById('previewContainer');
        
        preview.src = imageUrl;
        previewContainer.style.display = 'block';
        
        // Сохраняем данные файла для обработки
        extractedData.fileData = imageUrl;
        
        hideLoading();
        
        // Прокручиваем к предпросмотру
        previewContainer.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        hideLoading();
        alert('Ошибка при загрузке файла. Пожалуйста, попробуйте другой файл.');
    }
}

// Чтение файла как DataURL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        
        if (file.type.match('image.*')) {
            reader.readAsDataURL(file);
        } else if (file.type.match('application/pdf')) {
            // Для PDF конвертируем первую страницу в изображение
            alert('PDF файлы требуют конвертации. Для лучшего результата используйте изображения.');
            reader.readAsDataURL(file);
        } else {
            reject(new Error('Неподдерживаемый формат файла'));
        }
    });
}

// Инициализация Tesseract (асинхронная, без блокировки UI)
async function initTesseract() {
    try {
        showLoading('Загружаем модуль распознавания текста...');
        
        // Используем более легкую версию Tesseract для русского языка
        tesseractWorker = await Tesseract.createWorker('rus', 1, {
            workerPath: 'https://unpkg.com/tesseract.js@v4.0.2/dist/worker.min.js',
            langPath: 'https://tessdata.projectnaptha.com/4.0.0',
            corePath: 'https://unpkg.com/tesseract.js-core@v4.0.2/tesseract-core.wasm.js',
            logger: (m) => console.log('Tesseract:', m)
        });
        
        isTesseractReady = true;
        console.log('✅ Tesseract инициализирован');
        hideLoading();
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Tesseract:', error);
        hideLoading();
        
        // Предлагаем использовать ручной ввод
        document.getElementById('step1').innerHTML += `
            <div class="warning-box">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Модуль распознавания текста не загрузился. Вы можете продолжить с ручным вводом данных.</p>
                <button class="btn secondary" onclick="skipToManualInput()">
                    <i class="fas fa-keyboard"></i> Перейти к ручному вводу
                </button>
            </div>
        `;
    }
}

// Обработка изображения с улучшенным распознаванием
async function processImage() {
    if (!extractedData.fileData) {
        alert('Сначала загрузите фото паспорта');
        return;
    }
    
    if (!isTesseractReady) {
        alert('Модуль распознавания еще не готов. Пожалуйста, подождите или перейдите к ручному вводу.');
        return;
    }
    
    showLoading('Распознаем текст с паспорта. Это может занять 10-20 секунд...');
    
    try {
        // Подготавливаем изображение для лучшего распознавания
        const processedImage = await preprocessImage(extractedData.fileData);
        
        // Распознавание с улучшенными параметрами
        const result = await tesseractWorker.recognize(processedImage, {
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            tessedit_char_whitelist: '0123456789АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя -.,',
            preserve_interword_spaces: '1'
        });
        
        const text = result.data.text;
        console.log('📄 Распознанный текст:', text);
        
        // Парсинг данных
        parsePassportData(text);
        
        hideLoading();
        showStep(2);
        
        // Прокручиваем к следующему шагу
        document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('❌ Ошибка распознавания:', error);
        hideLoading();
        
        // Предлагаем ручной ввод
        if (confirm('Не удалось распознать текст автоматически. Перейти к ручному вводу?')) {
            showStep(2);
        }
    }
}

// Предобработка изображения для лучшего распознавания
function preprocessImage(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Устанавливаем размеры канваса
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Рисуем изображение
            ctx.drawImage(img, 0, 0);
            
            // Применяем фильтры для улучшения распознавания
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Увеличиваем контраст
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = data[i + 1] = data[i + 2] = avg > 128 ? 255 : 0;
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            resolve(canvas.toDataURL());
        };
        img.src = imageData;
    });
}

// Улучшенный парсинг данных из текста паспорта
function parsePassportData(text) {
    console.log('🔍 Парсим данные из текста...');
    
    // Удаляем лишние пробелы и переносы
    const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    // 1. Ищем ФИО (самая длинная строка с русскими буквами)
    const fioRegex = /[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+/g;
    const fioMatches = cleanText.match(fioRegex);
    
    if (fioMatches && fioMatches.length > 0) {
        // Выбираем самый длинный вариант (скорее всего, это полное ФИО)
        const longestFIO = fioMatches.reduce((a, b) => a.length > b.length ? a : b);
        document.getElementById('tenantName').value = longestFIO;
        console.log('✅ Найден ФИО:', longestFIO);
    }
    
    // 2. Ищем серию и номер паспорта
    const passportRegexes = [
        /(\d{2}\s?\d{2}\s?\d{6})/,           // 12 34 567890
        /(\d{4}\s?\d{6})/,                   // 1234 567890
        /(\d{10})/                          // 1234567890
    ];
    
    for (const regex of passportRegexes) {
        const match = cleanText.match(regex);
        if (match) {
            const passportNum = match[1].replace(/\s/g, '');
            if (passportNum.length === 10) {
                const formatted = `${passportNum.slice(0, 4)} ${passportNum.slice(4)}`;
                document.getElementById('tenantPassport').value = formatted;
                console.log('✅ Найден номер паспорта:', formatted);
                break;
            }
        }
    }
    
    // 3. Ищем дату выдачи
    const dateRegex = /(\d{1,2}[.\s]\d{1,2}[.\s]\d{4})/g;
    const dateMatches = cleanText.match(dateRegex);
    
    if (dateMatches && dateMatches.length > 0) {
        // Берем первую найденную дату (обычно это дата выдачи)
        const dateStr = dateMatches[0].replace(/\s/g, '.');
        const [day, month, year] = dateStr.split('.');
        if (year && year.length === 4 && parseInt(year) > 1900) {
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            document.getElementById('tenantIssueDate').value = formattedDate;
            console.log('✅ Найдена дата выдачи:', formattedDate);
        }
    }
    
    // 4. Ищем код подразделения
    const codeRegex = /(\d{3}[-—]\d{3})/;
    const codeMatch = cleanText.match(codeRegex);
    
    if (codeMatch) {
        document.getElementById('tenantDivisionCode').value = codeMatch[1];
        console.log('✅ Найден код подразделения:', codeMatch[1]);
    }
    
    // 5. Ищем место выдачи (обычно начинается с "ОВД", "МВД", "УВД", "ФМС")
    const issuedByRegex = /(ОВД|МВД|УВД|ФМС|ГУВД)[^.,\d]{10,50}/i;
    const issuedMatch = cleanText.match(issuedByRegex);
    
    if (issuedMatch) {
        const issuedBy = issuedMatch[0].substring(0, 100); // Ограничиваем длину
        document.getElementById('tenantIssuedBy').value = issuedBy;
        console.log('✅ Найдено место выдачи:', issuedBy);
    }
    
    // Сохраняем распознанный текст для ручной проверки
    extractedData.rawText = text;
    
    // Показываем всплывающее окно с распознанным текстом
    setTimeout(() => {
        showDataExtractionPopup(text);
    }, 500);
}

// Переход к ручному вводу
function skipToManualInput() {
    showStep(2);
    document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
}

// Управление шагами
function showStep(step) {
    // Скрыть все шаги
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показать нужный шаг
    document.getElementById(`step${step}`).classList.add('active');
    
    // Обновить прогресс-бар
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        if (index + 1 <= step) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });
    
    currentStep = step;
    
    // Сохраняем шаг
    localStorage.setItem('currentStep', step);
}

function nextStep() {
    if (currentStep < 4) {
        showStep(currentStep + 1);
    }
}

function previousStep() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

// Загрузка сохраненных данных
function loadSavedData() {
    try {
        const savedStep = localStorage.getItem('currentStep');
        if (savedStep) {
            showStep(parseInt(savedStep));
        }
        
        const savedData = localStorage.getItem('formData');
        if (savedData) {
            const data = JSON.parse(savedData);
            
            // Заполняем поля сохраненными данными
            Object.keys(data).forEach(key => {
                const element = document.getElementById(key);
                if (element && data[key]) {
                    element.value = data[key];
                }
            });
            
            console.log('✅ Данные загружены из localStorage');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки сохраненных данных:', error);
    }
}

// Настройка автосохранения
function setupAutoSave() {
    let saveTimeout;
    
    document.addEventListener('input', (e) => {
        if (e.target.matches('input, textarea, select')) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveFormData, 1000);
        }
    });
}

// Сохранение данных формы
function saveFormData() {
    try {
        const formData = {};
        
        // Собираем данные со всех полей ввода
        document.querySelectorAll('input, textarea, select').forEach(element => {
            if (element.id && element.id !== 'passportInput') {
                formData[element.id] = element.value;
            }
        });
        
        // Сохраняем в localStorage
        localStorage.setItem('formData', JSON.stringify(formData));
        console.log('💾 Данные сохранены');
        
    } catch (error) {
        console.error('❌ Ошибка сохранения данных:', error);
    }
}

// Сбор всех данных для договора
function collectFormData() {
    const residents = [];
    document.querySelectorAll('#residentsList .resident-item').forEach(item => {
        const inputs = item.querySelectorAll('input');
        if (inputs[0].value) {
            residents.push({
                name: inputs[0].value,
                birthDate: inputs[1].value ? new Date(inputs[1].value).toLocaleDateString('ru-RU') : ''
            });
        }
    });
    
    // Форматирование дат для договора
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleDateString('ru-RU', { month: 'long' });
            const year = date.getFullYear();
            return `${day} ${month} ${year} г.`;
        } catch (e) {
            return dateStr;
        }
    };
    
    // Форматирование дат для паспорта (краткий формат)
    const formatDateShort = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        } catch (e) {
            return dateStr;
        }
    };
    
    return {
        // Данные арендодателя
        landlordName: document.getElementById('landlordName').value,
        landlordPassport: document.getElementById('landlordPassport').value,
        landlordIssuedBy: document.getElementById('landlordIssuedBy').value,
        landlordIssueDate: formatDateShort(document.getElementById('landlordIssueDate').value),
        landlordDivisionCode: document.getElementById('landlordDivisionCode').value,
        landlordRegistration: document.getElementById('landlordRegistration').value,
        
        // Данные арендатора
        tenantName: document.getElementById('tenantName').value,
        tenantPassport: document.getElementById('tenantPassport').value,
        tenantIssuedBy: document.getElementById('tenantIssuedBy').value,
        tenantIssueDate: formatDateShort(document.getElementById('tenantIssueDate').value),
        tenantDivisionCode: document.getElementById('tenantDivisionCode').value,
        tenantRegistration: document.getElementById('tenantRegistration').value,
        
        // Данные договора
        apartmentAddress: document.getElementById('apartmentAddress').value,
        apartmentArea: document.getElementById('apartmentArea').value,
        roomsCount: document.getElementById('roomsCount').value,
        rentAmount: document.getElementById('rentAmount').value,
        rentAmountWords: numberToWordsRu(document.getElementById('rentAmount').value),
        depositAmount: document.getElementById('depositAmount').value,
        depositAmountWords: numberToWordsRu(document.getElementById('depositAmount').value),
        contractStart: formatDate(document.getElementById('contractStart').value),
        contractEnd: formatDate(document.getElementById('contractEnd').value),
        basisDocument: document.getElementById('basisDocument').value,
        
        // Показания счетчиков
        electricityCounter: document.getElementById('electricityCounter').value || '_________',
        hotWaterCounter: document.getElementById('hotWaterCounter').value || '_________',
        coldWaterCounter: document.getElementById('coldWaterCounter').value || '_________',
        
        // Текущая дата для заголовка
        currentDay: new Date().getDate().toString().padStart(2, '0'),
        currentMonth: new Date().toLocaleDateString('ru-RU', { month: 'long' }),
        currentYear: new Date().getFullYear(),
        
        // Полная текущая дата
        currentDate: new Date().toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }),
        
        // Проживающие
        residents: residents,
        residentsList: residents.map(r => r.name).join(', ')
    };
}

// Генерация договора с разбивкой на страницы
async function generateContract() {
    // Проверяем обязательные поля
    if (!validateForm()) {
        return;
    }
    
    // Сбор всех данных
    const contractData = collectFormData();
    
    // Показать загрузку
    showLoading('Формируем договор...');
    
    try {
        // Загружаем шаблон договора
        const response = await fetch('contract.html');
        let contractHtml = await response.text();
        
        // Заменяем плейсхолдеры на реальные данные
        contractHtml = replacePlaceholders(contractHtml, contractData);
        
        // Отображаем договор
        document.getElementById('contractPreview').innerHTML = contractHtml;
        
        // Сохраняем данные договора
        localStorage.setItem('contractData', JSON.stringify(contractData));
        localStorage.setItem('contractHtml', contractHtml);
        
        // Переходим к шагу 3
        hideLoading();
        showStep(3);
        
        // Прокручиваем к договору
        document.getElementById('contractPreview').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('❌ Ошибка генерации договора:', error);
        hideLoading();
        alert('Ошибка при формировании договора. Пожалуйста, попробуйте еще раз.');
    }
}

// Валидация формы
function validateForm() {
    const requiredFields = [
        'landlordName',
        'landlordPassport',
        'tenantName',
        'tenantPassport',
        'apartmentAddress',
        'rentAmount'
    ];
    
    const errors = [];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            errors.push(field.previousElementSibling?.textContent || field.placeholder);
            field.style.borderColor = '#e74c3c';
        } else {
            field.style.borderColor = '';
        }
    });
    
    if (errors.length > 0) {
        alert(`Пожалуйста, заполните обязательные поля:\n\n• ${errors.join('\n• ')}`);
        return false;
    }
    
    return true;
}

// Создание PDF с правильной разбивкой на страницы
async function downloadPDF() {
    showLoading('Создаем PDF файл...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            floatPrecision: 16
        });
        
        // Получаем HTML договора
        const contractDiv = document.getElementById('contractPreview');
        
        // Разбиваем договор на страницы
        await generatePDFWithPages(doc, contractDiv);
        
        // Сохраняем PDF
        const fileName = `Договор_аренды_${document.getElementById('tenantName').value.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        
        hideLoading();
        showStep(4);
        
    } catch (error) {
        console.error('❌ Ошибка создания PDF:', error);
        hideLoading();
        alert('Ошибка при создании PDF файла. Пожалуйста, используйте функцию печати.');
    }
}

// Генерация PDF с разбивкой на страницы
async function generatePDFWithPages(doc, element) {
    // Создаем копию элемента для манипуляций
    const tempDiv = element.cloneNode(true);
    
    // Устанавливаем стили для печати
    tempDiv.style.width = '190mm';
    tempDiv.style.fontSize = '12pt';
    tempDiv.style.lineHeight = '1.6';
    tempDiv.style.padding = '0';
    tempDiv.style.margin = '0';
    
    // Скрываем временный элемент
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    try {
        // Конвертируем HTML в изображение с высоким качеством
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: tempDiv.offsetWidth,
            height: tempDiv.offsetHeight
        });
        
        // Удаляем временный элемент
        document.body.removeChild(tempDiv);
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Вычисляем количество страниц
        const pageHeight = doc.internal.pageSize.height;
        let position = 0;
        
        while (position < imgHeight) {
            // Добавляем новую страницу если нужно
            if (position > 0) {
                doc.addPage();
            }
            
            // Вырезаем часть изображения для текущей страницы
            const canvas2 = document.createElement('canvas');
            const ctx2 = canvas2.getContext('2d');
            const sliceHeight = (pageHeight * canvas.width) / imgWidth;
            
            canvas2.width = canvas.width;
            canvas2.height = Math.min(sliceHeight, canvas.height - (position * canvas.width / imgWidth));
            
            ctx2.drawImage(canvas, 0, position * canvas.width / imgWidth, 
                          canvas.width, sliceHeight, 
                          0, 0, canvas.width, sliceHeight);
            
            const pageImgData = canvas2.toDataURL('image/jpeg', 1.0);
            
            // Добавляем изображение страницы в PDF
            doc.addImage(pageImgData, 'JPEG', 10, 10, imgWidth, 
                        (canvas2.height * imgWidth) / canvas.width);
            
            position += pageHeight - 20; // Оставляем поля
        }
        
    } catch (error) {
        document.body.removeChild(tempDiv);
        throw error;
    }
}

// Печать договора
function printContract() {
    const printWindow = window.open('', '_blank');
    const contractHtml = document.getElementById('contractPreview').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Договор аренды - Печать</title>
                <meta charset="UTF-8">
                <style>
                    @media print {
                        body {
                            font-family: 'Times New Roman', serif;
                            line-height: 1.6;
                            font-size: 12pt;
                            margin: 0;
                            padding: 15mm;
                        }
                        .page-break {
                            page-break-before: always;
                            margin-top: 20mm;
                        }
                        .no-print { display: none !important; }
                        @page {
                            margin: 15mm;
                        }
                    }
                    @media screen {
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            max-width: 210mm;
                            margin: 0 auto;
                        }
                        .print-controls {
                            position: fixed;
                            bottom: 20px;
                            right: 20px;
                            background: white;
                            padding: 15px;
                            border-radius: 8px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            z-index: 1000;
                        }
                    }
                </style>
            </head>
            <body>
                ${contractHtml}
                <div class="no-print print-controls">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                        🖨️ Печать
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        ✕ Закрыть
                    </button>
                </div>
            </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Автоматически открываем диалог печати
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 1000);
}

// Начать новый договор
function startNew() {
    if (confirm('Начать новый договор? Все текущие данные будут очищены.')) {
        // Очищаем форму
        document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea').forEach(input => {
            if (!input.id.includes('Counter')) { // Не очищаем счетчики
                input.value = '';
            }
        });
        
        // Очищаем предпросмотр
        document.getElementById('passportPreview').src = '';
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('contractPreview').innerHTML = '';
        
        // Сбрасываем форму
        document.getElementById('residentsList').innerHTML = `
            <div class="resident-item">
                <input type="text" placeholder="ФИО" value="Адамбаев Абат">
                <input type="date" placeholder="Дата рождения">
            </div>
            <div class="resident-item">
                <input type="text" placeholder="ФИО" value="Адамбаев Джамшут">
                <input type="date" placeholder="Дата рождения">
            </div>
            <div class="resident-item">
                <input type="text" placeholder="ФИО" value="Хайтбаева Рубия">
                <input type="date" placeholder="Дата рождения">
            </div>
            <div class="resident-item">
                <input type="text" placeholder="ФИО" value="Кутлимуратов Абаз">
                <input type="date" placeholder="Дата рождения">
            </div>
            <div class="resident-item">
                <input type="text" placeholder="ФИО" value="Ибрагимов Мадер">
                <input type="date" placeholder="Дата рождения">
            </div>
            <div class="resident-item">
                <input type="text" placeholder="ФИО" value="Хайтбаева Янгилжан">
                <input type="date" placeholder="Дата рождения">
            </div>
        `;
        
        // Устанавливаем текущие даты
        setCurrentDate();
        
        // Очищаем сохраненные данные
        localStorage.removeItem('formData');
        localStorage.removeItem('currentStep');
        localStorage.removeItem('contractData');
        localStorage.removeItem('contractHtml');
        
        // Возвращаемся к первому шагу
        showStep(1);
    }
}

// Вспомогательные функции
function showLoading(message) {
    let loading = document.getElementById('loadingOverlay');
    
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loadingOverlay';
        document.body.appendChild(loading);
        
        // Стили для загрузки
        const style = document.createElement('style');
        style.textContent = `
            #loadingOverlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(5px);
            }
            .loading-content {
                background: white;
                padding: 40px;
                border-radius: 15px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                max-width: 400px;
                width: 90%;
            }
            .spinner {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #3498db;
                border-radius: 50%;
                width: 60px;
                height: 60px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .loading-content p {
                margin: 0;
                font-size: 16px;
                color: #333;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
    
    loading.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message || 'Загрузка...'}</p>
        </div>
    `;
    
    loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Добавьте остальные функции (numberToWordsRu, replacePlaceholders и др.) из предыдущей версии
// [Остальной код остается таким же, как в предыдущей версии]

// Добавление проживающего
function addResident() {
    const residentsList = document.getElementById('residentsList');
    const residentItem = document.createElement('div');
    residentItem.className = 'resident-item';
    residentItem.innerHTML = `
        <input type="text" placeholder="ФИО">
        <input type="date" placeholder="Дата рождения">
        <button class="btn-remove" onclick="removeResident(this)" title="Удалить">
            <i class="fas fa-times"></i>
        </button>
    `;
    residentsList.appendChild(residentItem);
}

// Удаление проживающего
function removeResident(button) {
    if (confirm('Удалить этого проживающего?')) {
        button.closest('.resident-item').remove();
        saveFormData();
    }
}

// Показать всплывающее окно с распознанным текстом
function showDataExtractionPopup(text) {
    const popup = document.createElement('div');
    popup.className = 'data-extraction-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h3><i class="fas fa-search"></i> Распознанный текст</h3>
            <p>Вы можете скопировать нужные данные из распознанного текста:</p>
            <div class="text-preview">${text.replace(/\n/g, '<br>')}</div>
            <div class="popup-actions">
                <button class="btn secondary" onclick="closePopup(this)">
                    <i class="fas fa-times"></i> Закрыть
                </button>
                <button class="btn" onclick="copyTextToClipboard()">
                    <i class="fas fa-copy"></i> Копировать текст
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Стили для попапа
    const style = document.createElement('style');
    style.textContent = `
        .data-extraction-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }
        .data-extraction-popup .popup-content {
            background: white;
            border-radius: 10px;
            padding: 25px;
            max-width: 800px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .data-extraction-popup .text-preview {
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
            max-height: 300px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 14px;
            line-height: 1.5;
        }
        .data-extraction-popup .popup-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
        }
    `;
    document.head.appendChild(style);
}

function closePopup(button) {
    button.closest('.data-extraction-popup').remove();
}

function copyTextToClipboard() {
    if (extractedData.rawText) {
        navigator.clipboard.writeText(extractedData.rawText)
            .then(() => {
                alert('Текст скопирован в буфер обмена!');
                document.querySelector('.data-extraction-popup')?.remove();
            })
            .catch(err => {
                console.error('Ошибка копирования:', err);
                alert('Не удалось скопировать текст');
            });
    }
}

// Конвертация числа в слова (русский)
function numberToWordsRu(number) {
    const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const thousands = ['', 'тысяча', 'тысячи', 'тысяч'];
    
    let num = parseInt(number);
    if (isNaN(num) || num === 0) return 'ноль';
    
    let result = '';
    
    // Тысячи
    const th = Math.floor(num / 1000);
    if (th > 0) {
        if (th === 1) result += 'одна тысяча ';
        else if (th === 2) result += 'две тысячи ';
        else if (th < 5) {
            const [h, t, u] = splitNumber(th);
            result += numberToWordsRu(th) + ' тысячи ';
        } else {
            const [h, t, u] = splitNumber(th);
            result += numberToWordsRu(th) + ' тысяч ';
        }
        num %= 1000;
    }
    
    // Сотни
    const h = Math.floor(num / 100);
    if (h > 0) {
        result += hundreds[h] + ' ';
        num %= 100;
    }
    
    // Десятки и единицы
    if (num >= 20) {
        const t = Math.floor(num / 10);
        result += tens[t] + ' ';
        num %= 10;
    }
    
    if (num >= 10) {
        result += teens[num - 10] + ' ';
        num = 0;
    }
    
    if (num > 0) {
        result += units[num] + ' ';
    }
    
    result = result.trim() + ' рублей';
    return result.charAt(0).toUpperCase() + result.slice(1);
}

function splitNumber(num) {
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;
    return [h, t, u];
}

// Замена плейсхолдеров в HTML
function replacePlaceholders(html, data) {
    let result = html;
    
    // Заменяем все плейсхолдеры
    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    
    // Обрабатываем проживающих отдельно
    if (data.residents && data.residents.length > 0) {
        let residentsHtml = '';
        data.residents.forEach((resident, index) => {
            residentsHtml += `
                <div class="clause">
                    ${index + 1}. Ф.И.О., дата рождения <strong>${resident.name}</strong>${resident.birthDate ? `, ${resident.birthDate}` : ''}
                </div>
            `;
        });
        result = result.replace('{{residentsDetailed}}', residentsHtml);
    }
    
    return result;
}