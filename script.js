// Основные переменные
let currentStep = 1;
let extractedData = {};
let tesseractWorker = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Настройка загрузки файлов
    setupFileUpload();
    
    // Загрузка сохраненных данных, если есть
    loadSavedData();
    
    // Инициализация Tesseract
    initTesseract();
});

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
function handleFileSelect(file) {
    if (!file.type.match('image.*') && !file.type.match('application/pdf')) {
        alert('Пожалуйста, выберите изображение или PDF файл');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 5MB');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const preview = document.getElementById('passportPreview');
        const previewContainer = document.getElementById('previewContainer');
        
        preview.src = e.target.result;
        previewContainer.style.display = 'block';
        
        // Сохраняем данные файла для обработки
        extractedData.fileData = e.target.result;
        
        // Прокручиваем к предпросмотру
        previewContainer.scrollIntoView({ behavior: 'smooth' });
    };
    
    if (file.type.match('image.*')) {
        reader.readAsDataURL(file);
    } else if (file.type.match('application/pdf')) {
        // Для PDF можно добавить конвертацию в изображение
        alert('PDF файлы будут обработаны. Для лучшего результата используйте изображения.');
        reader.readAsDataURL(file);
    }
}

// Инициализация Tesseract
async function initTesseract() {
    try {
        tesseractWorker = await Tesseract.createWorker('rus+eng');
        console.log('Tesseract инициализирован');
    } catch (error) {
        console.error('Ошибка инициализации Tesseract:', error);
        alert('Не удалось загрузить модуль распознавания текста');
    }
}

// Обработка изображения
async function processImage() {
    if (!extractedData.fileData) {
        alert('Сначала загрузите фото паспорта');
        return;
    }
    
    showLoading('Распознаем текст с паспорта...');
    
    try {
        const result = await tesseractWorker.recognize(extractedData.fileData);
        const text = result.data.text;
        
        extractedData.text = text;
        parsePassportData(text);
        
        hideLoading();
        showStep(2);
        
        // Прокручиваем к следующему шагу
        document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Ошибка распознавания:', error);
        hideLoading();
        alert('Ошибка при распознавании текста. Пожалуйста, введите данные вручную.');
        showStep(2);
    }
}

// Парсинг данных из текста паспорта
function parsePassportData(text) {
    console.log('Распознанный текст:', text);
    
    // Извлечение ФИО
    const fioRegex = /[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){2}/g;
    const fioMatches = text.match(fioRegex);
    
    if (fioMatches && fioMatches.length > 0) {
        document.getElementById('tenantName').value = fioMatches[0];
    }
    
    // Извлечение серии и номера паспорта
    const passportRegex = /(\d{2}\s?\d{2}\s?\d{6})/g;
    const passportMatch = text.match(passportRegex);
    
    if (passportMatch) {
        document.getElementById('tenantPassport').value = passportMatch[0].replace(/(\d{2})(\d{2})(\d{6})/, '$1 $2 $3');
    }
    
    // Извлечение даты выдачи
    const dateRegex = /(\d{2}\.\d{2}\.\d{4})/g;
    const dateMatches = text.match(dateRegex);
    
    if (dateMatches && dateMatches.length > 0) {
        const dateStr = dateMatches[0];
        const [day, month, year] = dateStr.split('.');
        document.getElementById('tenantIssueDate').value = `${year}-${month}-${day}`;
    }
    
    // Извлечение кода подразделения
    const codeRegex = /(\d{3}-\d{3})/g;
    const codeMatch = text.match(codeRegex);
    
    if (codeMatch) {
        document.getElementById('tenantDivisionCode').value = codeMatch[0];
    }
    
    // Сохраняем распознанный текст для ручного поиска
    extractedData.rawText = text;
    
    // Предлагаем пользователю вручную найти и скопировать другие данные
    showDataExtractionPopup(text);
}

// Всплывающее окно для ручного извлечения данных
function showDataExtractionPopup(text) {
    const popup = document.createElement('div');
    popup.className = 'data-extraction-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h3><i class="fas fa-search"></i> Помощник извлечения данных</h3>
            <p>Мы распознали текст с паспорта. Вы можете скопировать нужные данные:</p>
            <div class="text-preview">${text.replace(/\n/g, '<br>')}</div>
            <div class="popup-actions">
                <button class="btn secondary" onclick="this.closest('.data-extraction-popup').remove()">
                    <i class="fas fa-times"></i> Закрыть
                </button>
                <button class="btn" onclick="saveTextToClipboard()">
                    <i class="fas fa-copy"></i> Копировать весь текст
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Автоматическое закрытие через 30 секунд
    setTimeout(() => {
        if (popup.parentNode) {
            popup.remove();
        }
    }, 30000);
}

// Переснять фото
function retakePhoto() {
    document.getElementById('passportInput').value = '';
    document.getElementById('previewContainer').style.display = 'none';
    extractedData.fileData = null;
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

// Добавить проживающего
function addResident() {
    const residentsList = document.getElementById('residentsList');
    const residentItem = document.createElement('div');
    residentItem.className = 'resident-item';
    residentItem.innerHTML = `
        <input type="text" placeholder="ФИО">
        <input type="date" placeholder="Дата рождения">
    `;
    residentsList.appendChild(residentItem);
}

// Генерация договора
async function generateContract() {
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
        console.error('Ошибка генерации договора:', error);
        hideLoading();
        alert('Ошибка при формировании договора. Пожалуйста, попробуйте еще раз.');
    }
}

// Сбор данных формы
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
    
    // Форматирование дат
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };
    
    return {
        // Данные арендодателя
        landlordName: document.getElementById('landlordName').value,
        landlordPassport: document.getElementById('landlordPassport').value,
        landlordIssuedBy: document.getElementById('landlordIssuedBy').value,
        landlordIssueDate: formatDate(document.getElementById('landlordIssueDate').value),
        landlordDivisionCode: document.getElementById('landlordDivisionCode').value,
        landlordRegistration: document.getElementById('landlordRegistration').value,
        
        // Данные арендатора
        tenantName: document.getElementById('tenantName').value,
        tenantPassport: document.getElementById('tenantPassport').value,
        tenantIssuedBy: document.getElementById('tenantIssuedBy').value,
        tenantIssueDate: formatDate(document.getElementById('tenantIssueDate').value),
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
        
        // Текущая дата
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

// Замена плейсхолдеров в договоре
function replacePlaceholders(html, data) {
    let result = html;
    
    // Заменяем все плейсхолдеры формата {{key}}
    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    
    // Специальная обработка для списка проживающих
    if (data.residents && data.residents.length > 0) {
        let residentsHtml = '';
        data.residents.forEach((resident, index) => {
            residentsHtml += `
                <p>${index + 1}.Ф.И.О., дата рождения <strong>${resident.name}</strong>${resident.birthDate ? `, ${resident.birthDate}` : ''}</p>
            `;
        });
        
        result = result.replace('{{residentsDetailed}}', residentsHtml);
    }
    
    return result;
}

// Конвертация числа в слова (рубль)
function numberToWordsRu(number) {
    const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    
    let num = parseInt(number);
    if (isNaN(num) || num === 0) return 'ноль';
    
    let result = '';
    
    // Тысячи
    const thousands = Math.floor(num / 1000);
    if (thousands > 0) {
        if (thousands === 1) result += 'одна тысяча ';
        else if (thousands === 2) result += 'две тысячи ';
        else if (thousands < 5) result += units[thousands] + ' тысячи ';
        else if (thousands < 10) result += units[thousands] + ' тысяч ';
        else if (thousands < 20) result += teens[thousands - 10] + ' тысяч ';
        else {
            const t = Math.floor(thousands / 10);
            const u = thousands % 10;
            result += tens[t] + ' ';
            if (u > 0) result += units[u] + ' ';
            result += 'тысяч ';
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

// Скачивание PDF
async function downloadPDF() {
    showLoading('Создаем PDF файл...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Получаем HTML договора
        const contractHtml = document.getElementById('contractPreview').innerHTML;
        
        // Используем html2canvas для конвертации HTML в изображение
        const canvas = await html2canvas(document.getElementById('contractPreview'), {
            scale: 2,
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Добавляем изображение в PDF
        doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        
        // Сохраняем PDF
        doc.save(`Договор_аренды_${new Date().toISOString().slice(0, 10)}.pdf`);
        
        hideLoading();
        showStep(4);
        
    } catch (error) {
        console.error('Ошибка создания PDF:', error);
        hideLoading();
        alert('Ошибка при создании PDF файла. Пожалуйста, попробуйте еще раз или используйте функцию печати.');
    }
}

// Печать договора
function printContract() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Договор аренды - Печать</title>
                <style>
                    body { font-family: 'Times New Roman', serif; line-height: 1.6; }
                    @media print { 
                        body { margin: 0; padding: 20px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${document.getElementById('contractPreview').innerHTML}
                <div class="no-print" style="margin-top: 20px; text-align: center;">
                    <button onclick="window.print()">Печать</button>
                    <button onclick="window.close()">Закрыть</button>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
}

// Загрузка сохраненных данных
function loadSavedData() {
    try {
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
        }
    } catch (error) {
        console.error('Ошибка загрузки сохраненных данных:', error);
    }
}

// Сохранение данных формы
function saveFormData() {
    const formData = {};
    
    // Собираем данные со всех полей ввода
    document.querySelectorAll('input, textarea, select').forEach(element => {
        if (element.id) {
            formData[element.id] = element.value;
        }
    });
    
    // Сохраняем в localStorage
    localStorage.setItem('formData', JSON.stringify(formData));
}

// Автосохранение при изменении полей
document.addEventListener('input', (e) => {
    if (e.target.matches('input, textarea, select')) {
        saveFormData();
    }
});

// Начать новый договор
function startNew() {
    if (confirm('Начать новый договор? Все текущие данные будут очищены.')) {
        // Очищаем форму
        document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
            input.value = '';
        });
        
        // Очищаем предпросмотр
        document.getElementById('passportPreview').src = '';
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('contractPreview').innerHTML = '';
        
        // Очищаем сохраненные данные
        localStorage.removeItem('formData');
        
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
        loading.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>${message || 'Загрузка...'}</p>
            </div>
        `;
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
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            .loading-content {
                background: white;
                padding: 40px;
                border-radius: 10px;
                text-align: center;
            }
            .spinner {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #3498db;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Копирование текста в буфер обмена
function saveTextToClipboard() {
    if (extractedData.text) {
        navigator.clipboard.writeText(extractedData.text)
            .then(() => alert('Текст скопирован в буфер обмена!'))
            .catch(err => console.error('Ошибка копирования:', err));
    }
}

// Поделиться ссылкой
document.getElementById('shareBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    
    if (navigator.share) {
        navigator.share({
            title: 'Договор аренды',
            text: 'Сгенерированный договор аренды квартиры',
            url: window.location.href
        });
    } else {
        // Копируем ссылку, если Web Share API не поддерживается
        navigator.clipboard.writeText(window.location.href)
            .then(() => alert('Ссылка скопирована в буфер обмена!'))
            .catch(err => console.error('Ошибка копирования:', err));
    }
});