// Основные переменные
let currentStep = 1;
let tesseractWorker = null;
let ocrText = '';
let currentFile = null;

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
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    document.getElementById('contractStart').valueAsDate = today;
    document.getElementById('contractEnd').valueAsDate = nextMonth;
    
    // Инициализируем список проживающих
    initResidents();
    
    // Инициализируем Tesseract в фоне
    initTesseract();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Загрузка файлов
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const cameraInput = document.getElementById('cameraInput');
    
    fileInput.addEventListener('change', handleFileSelect);
    cameraInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#764ba2';
        uploadArea.style.background = '#e9ecef';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.background = '#f8f9fa';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.background = '#f8f9fa';
        
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
    
    if (!file.type.match('image.*') && !file.type.match('application/pdf')) {
        alert('Пожалуйста, выберите изображение (JPG, PNG) или PDF файл');
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

// Инициализация Tesseract
async function initTesseract() {
    try {
        // Используем облегченную версию для русского языка
        tesseractWorker = await Tesseract.createWorker('rus', 1, {
            workerPath: 'https://unpkg.com/tesseract.js@v4.0.2/dist/worker.min.js',
            langPath: 'https://tessdata.projectnaptha.com/4.0.0',
            corePath: 'https://unpkg.com/tesseract.js-core@v4.0.2/tesseract-core.wasm.js',
            logger: m => console.log('Tesseract:', m)
        });
        
        console.log('Tesseract готов к работе');
    } catch (error) {
        console.error('Ошибка инициализации Tesseract:', error);
        showNotification('Модуль распознавания текста не загрузился. Используйте ручной ввод.', 'warning');
    }
}

// Распознавание текста
async function recognizeText() {
    if (!currentFile) {
        alert('Сначала загрузите фото паспорта');
        return;
    }
    
    if (!tesseractWorker) {
        alert('Модуль распознавания еще не готов. Используйте ручной ввод.');
        goToStep(2);
        return;
    }
    
    showLoading('Распознаем текст... Это займет 10-20 секунд');
    
    try {
        // Читаем файл как DataURL
        const imageUrl = await readFileAsDataURL(currentFile);
        
        // Распознаем текст
        const result = await tesseractWorker.recognize(imageUrl);
        ocrText = result.data.text;
        
        hideLoading();
        
        // Показываем распознанный текст
        showOCRModal(ocrText);
        
    } catch (error) {
        console.error('Ошибка распознавания:', error);
        hideLoading();
        alert('Не удалось распознать текст. Пожалуйста, введите данные вручную.');
        goToStep(2);
    }
}

// Чтение файла как DataURL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
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

// Использовать данные из OCR
function useOCRData() {
    if (!ocrText) return;
    
    // Парсим данные из текста
    const data = parseOCRData(ocrText);
    
    // Заполняем поля арендатора
    if (data.fullName) {
        document.getElementById('tenantName').value = data.fullName;
    }
    if (data.passport) {
        document.getElementById('tenantPassport').value = data.passport;
    }
    if (data.issueDate) {
        document.getElementById('tenantIssueDate').value = data.issueDate;
    }
    if (data.divisionCode) {
        document.getElementById('tenantDivisionCode').value = data.divisionCode;
    }
    
    closeOCRModal();
    goToStep(2);
}

// Парсинг данных из OCR
function parseOCRData(text) {
    const result = {};
    
    // Удаляем лишние пробелы
    text = text.replace(/\s+/g, ' ').trim();
    
    // Поиск ФИО
    const fioMatch = text.match(/[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+/);
    if (fioMatch) {
        result.fullName = fioMatch[0];
    }
    
    // Поиск паспортных данных
    const passportMatch = text.match(/(\d{2}\s?\d{2}\s?\d{6})/);
    if (passportMatch) {
        const passport = passportMatch[1].replace(/\s/g, '');
        if (passport.length === 10) {
            result.passport = passport.slice(0, 4) + ' ' + passport.slice(4);
        }
    }
    
    // Поиск даты выдачи
    const dateMatch = text.match(/(\d{2}[.\s]\d{2}[.\s]\d{4})/);
    if (dateMatch) {
        const dateStr = dateMatch[1].replace(/\s/g, '.');
        const [day, month, year] = dateStr.split('.');
        if (year.length === 4) {
            result.issueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }
    
    // Поиск кода подразделения
    const codeMatch = text.match(/(\d{3}[-—]\d{3})/);
    if (codeMatch) {
        result.divisionCode = codeMatch[1];
    }
    
    return result;
}

// Пропустить OCR и перейти к ручному вводу
function skipToManual() {
    goToStep(2);
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
    const progress = (currentStep - 1) / 2 * 100;
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
    const residentId = Date.now();
    
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
async function generateContract() {
    // Проверка обязательных полей
    if (!validateForm()) {
        return;
    }
    
    showLoading('Формируем договор...');
    
    try {
        // Собираем данные
        const data = collectFormData();
        
        // Загружаем шаблон
        const response = await fetch('contract.html');
        let template = await response.text();
        
        // Заменяем плейсхолдеры
        template = replacePlaceholders(template, data);
        
        // Отображаем договор
        document.getElementById('contractPreview').innerHTML = template;
        
        // Переходим к шагу 3
        setTimeout(() => {
            hideLoading();
            goToStep(3);
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
    
    // Форматирование дат
    const formatDateRU = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString('ru-RU', { month: 'long' });
        const year = date.getFullYear();
        return `${day} ${month} ${year} г.`;
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
    
    return {
        // Арендодатель
        landlordName: document.getElementById('landlordName').value,
        landlordPassport: document.getElementById('landlordPassport').value,
        landlordIssuedBy: document.getElementById('landlordIssuedBy').value,
        landlordIssueDate: formatDate(document.getElementById('landlordIssueDate').value),
        landlordDivisionCode: document.getElementById('landlordDivisionCode').value,
        landlordRegistration: document.getElementById('landlordRegistration').value,
        
        // Арендатор
        tenantName: document.getElementById('tenantName').value,
        tenantPassport: document.getElementById('tenantPassport').value,
        tenantIssuedBy: document.getElementById('tenantIssuedBy').value,
        tenantIssueDate: formatDate(document.getElementById('tenantIssueDate').value),
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
        contractStart: formatDateRU(document.getElementById('contractStart').value),
        contractEnd: formatDateRU(document.getElementById('contractEnd').value),
        
        // Счетчики
        electricityCounter: document.getElementById('electricityCounter').value || '_________',
        hotWaterCounter: document.getElementById('hotWaterCounter').value || '_________',
        coldWaterCounter: document.getElementById('coldWaterCounter').value || '_________',
        
        // Проживающие
        residents: residents,
        residentsList: residents.map(r => `${r.name}${r.birthdate ? `, ${r.birthdate}` : ''}`).join('\n'),
        
        // Текущая дата
        currentDate: new Date().toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
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
        'contractEnd'
    ];
    
    const errors = [];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            errors.push(field.previousElementSibling.textContent);
            field.style.borderColor = '#dc3545';
        } else {
            field.style.borderColor = '';
        }
    });
    
    if (errors.length > 0) {
        alert('Пожалуйста, заполните все обязательные поля (помечены *):\n\n' + errors.map(e => '• ' + e).join('\n'));
        return false;
    }
    
    return true;
}

// Замена плейсхолдеров
function replacePlaceholders(template, data) {
    let result = template;
    
    // Основные поля
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, data[key] || '');
    });
    
    // Особый обработчик для списка проживающих
    if (data.residents && data.residents.length > 0) {
        let residentsHtml = '';
        data.residents.forEach((resident, index) => {
            residentsHtml += `<p>${index + 1}. Ф.И.О., дата рождения <strong>${resident.name}</strong>${resident.birthdate ? `, ${resident.birthdate}` : ''}</p>`;
        });
        result = result.replace('{{residentsDetailed}}', residentsHtml);
    }
    
    return result;
}

// Скачать PDF
async function downloadPDF() {
    showLoading('Создаем PDF...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
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
    const printWindow = window.open('', '_blank');
    const contractHtml = document.getElementById('contractPreview').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Договор аренды - Печать</title>
            <style>
                body {
                    font-family: 'Times New Roman', serif;
                    line-height: 1.6;
                    margin: 20mm;
                    font-size: 12pt;
                }
                .page {
                    page-break-after: always;
                    margin-bottom: 20mm;
                }
                .page:last-child {
                    page-break-after: auto;
                }
                @media print {
                    body { margin: 0; padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            ${contractHtml}
            <div class="no-print" style="position: fixed; bottom: 20px; right: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Печать
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                    Закрыть
                </button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
}

// Завершить
function finish() {
    if (confirm('Спасибо за использование генератора договоров!\n\nНачать новый договор?')) {
        location.reload();
    }
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

function showNotification(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'warning' ? '#856404' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'warning' ? '#ffeeba' : '#bee5eb'};
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    // Автоудаление через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
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
        console.log('Данные сохранены');
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
        }
        
        // Восстанавливаем текущий шаг
        if (data.currentStep) {
            goToStep(data.currentStep);
        }
        
        console.log('Данные загружены');
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}