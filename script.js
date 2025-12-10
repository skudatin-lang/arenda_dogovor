// Основные переменные
let currentStep = 1;
let extractedData = {};
let tesseractWorker = null;
let isTesseractReady = false;
let currentUserRole = 'tenant'; // 'tenant' или 'landlord'

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализируем приложение...');
    
    // Настройка загрузки файлов
    setupFileUpload();
    
    // Загрузка сохраненных данных
    loadSavedData();
    
    // Инициализация Tesseract
    initTesseract();
    
    // Устанавливаем текущую дату
    setCurrentDate();
    
    // Настройка переключателя пользователя
    setupUserSwitcher();
    
    console.log('Приложение инициализировано');
});

// Настройка переключателя "Кто сканирует"
function setupUserSwitcher() {
    const roleSelect = document.getElementById('userRole');
    if (roleSelect) {
        roleSelect.addEventListener('change', function() {
            currentUserRole = this.value;
            console.log('Выбрана роль:', currentUserRole);
            updateRoleInfo();
        });
    }
}

// Обновление информации о роли
function updateRoleInfo() {
    const roleInfo = document.getElementById('roleInfo');
    if (roleInfo) {
        const roleText = currentUserRole === 'tenant' ? 'Арендатора' : 'Арендодателя';
        roleInfo.textContent = `(будут заполнены данные ${roleText})`;
    }
}

// Установка текущей даты
function setCurrentDate() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthLater = new Date(now.setMonth(now.getMonth() + 1)).toISOString().split('T')[0];
    
    const startInput = document.getElementById('contractStart');
    const endInput = document.getElementById('contractEnd');
    
    if (startInput && !startInput.value) startInput.value = today;
    if (endInput && !endInput.value) endInput.value = monthLater;
}

// Настройка загрузки файлов (ИСПРАВЛЕНО)
function setupFileUpload() {
    console.log('Настраиваем загрузку файлов...');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('passportInput');
    
    if (!uploadArea || !fileInput) {
        console.error('Не найдены элементы загрузки файлов!');
        return;
    }
    
    // Клик по области загрузки
    uploadArea.addEventListener('click', function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
            fileInput.click();
        }
    });
    
    // Перетаскивание файлов
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#2980b9';
        this.style.background = '#e3f2fd';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#3498db';
        this.style.background = '#f8fafc';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#3498db';
        this.style.background = '#f8fafc';
        
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    
    // Выбор файла через input
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    console.log('Загрузка файлов настроена');
}

// Обработка выбранного файла (ИСПРАВЛЕНО)
async function handleFileSelect(file) {
    console.log('Обрабатываем файл:', file.name);
    
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
        
        if (!preview || !previewContainer) {
            console.error('Не найден элемент предпросмотра');
            return;
        }
        
        preview.src = imageUrl;
        previewContainer.style.display = 'block';
        
        // Сохраняем данные файла для обработки
        extractedData.fileData = imageUrl;
        
        hideLoading();
        showToast('Изображение загружено! Нажмите "Распознать данные"', 'success');
        
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
            alert('Для PDF требуется конвертация. Для лучшего результата используйте изображения.');
            reader.readAsDataURL(file);
        } else {
            reject(new Error('Неподдерживаемый формат файла'));
        }
    });
}

// Инициализация Tesseract (УПРОЩЕНО)
async function initTesseract() {
    try {
        console.log('Инициализируем Tesseract...');
        
        // Простая инициализация без workerPath
        tesseractWorker = await Tesseract.createWorker('rus', 1, {
            logger: (m) => console.log('Tesseract:', m.status || m)
        });
        
        isTesseractReady = true;
        console.log('✅ Tesseract готов к работе');
        
        showToast('Модуль распознавания текста загружен', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Tesseract:', error);
        showToast('Модуль распознавания не загрузился. Используйте ручной ввод.', 'error');
        
        // Показываем кнопку для перехода к ручному вводу
        setTimeout(() => {
            const step1Section = document.getElementById('step1');
            if (step1Section) {
                step1Section.innerHTML += `
                    <div class="warning-box">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Модуль распознавания текста не загрузился. Вы можете продолжить с ручным вводом данных.</p>
                        <button class="btn secondary" onclick="skipToManualInput()">
                            <i class="fas fa-keyboard"></i> Перейти к ручному вводу
                        </button>
                    </div>
                `;
            }
        }, 1000);
    }
}

// Распознавание изображения (УПРОЩЕНО)
async function processImage() {
    console.log('Начинаем распознавание...');
    
    if (!extractedData.fileData) {
        alert('Сначала загрузите фото паспорта');
        return;
    }
    
    if (!isTesseractReady) {
        alert('Модуль распознавания еще не готов. Подождите или перейдите к ручному вводу.');
        return;
    }
    
    showLoading('Распознаем текст... Это займет 5-15 секунд');
    
    try {
        const result = await tesseractWorker.recognize(extractedData.fileData);
        const text = result.data.text;
        console.log('Распознанный текст:', text);
        
        // Сохраняем текст
        extractedData.rawText = text;
        
        // Парсим данные
        parsePassportData(text);
        
        hideLoading();
        showStep(2);
        
        // Показываем всплывающее окно с текстом
        setTimeout(() => {
            showDataExtractionPopup(text);
        }, 500);
        
    } catch (error) {
        console.error('Ошибка распознавания:', error);
        hideLoading();
        
        if (confirm('Не удалось распознать текст. Перейти к ручному вводу?')) {
            showStep(2);
        }
    }
}

// Упрощенный парсинг данных паспорта
function parsePassportData(text) {
    console.log('Парсим данные из текста...');
    
    // Очищаем текст
    const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    // Определяем ID полей в зависимости от роли
    const prefix = currentUserRole === 'tenant' ? 'tenant' : 'landlord';
    
    // 1. Ищем ФИО
    const fioRegex = /[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+/g;
    const fioMatches = cleanText.match(fioRegex);
    if (fioMatches && fioMatches.length > 0) {
        const fullName = fioMatches[0];
        document.getElementById(`${prefix}Name`).value = fullName;
        console.log('Найден ФИО:', fullName);
    }
    
    // 2. Ищем номер паспорта (разные форматы)
    const passportPatterns = [
        /\d{2}\s?\d{2}\s?\d{6}/,      // 12 34 567890
        /\d{4}\s?\d{6}/,              // 1234 567890
        /\d{10}/                      // 1234567890
    ];
    
    for (const pattern of passportPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
            const passportNum = match[0].replace(/\s/g, '');
            if (passportNum.length === 10) {
                const formatted = `${passportNum.slice(0, 2)} ${passportNum.slice(2, 4)} ${passportNum.slice(4)}`;
                document.getElementById(`${prefix}Passport`).value = formatted;
                console.log('Найден номер паспорта:', formatted);
                break;
            }
        }
    }
    
    // 3. Ищем дату выдачи
    const dateRegex = /(\d{2}[.\s]\d{2}[.\s]\d{4})/;
    const dateMatch = cleanText.match(dateRegex);
    if (dateMatch) {
        const dateStr = dateMatch[0].replace(/\s/g, '.');
        const [day, month, year] = dateStr.split('.');
        if (year && year.length === 4) {
            document.getElementById(`${prefix}IssueDate`).value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log('Найдена дата выдачи:', dateStr);
        }
    }
    
    // 4. Ищем код подразделения
    const codeRegex = /\d{3}[-—]\d{3}/;
    const codeMatch = cleanText.match(codeRegex);
    if (codeMatch) {
        document.getElementById(`${prefix}DivisionCode`).value = codeMatch[0];
        console.log('Найден код подразделения:', codeMatch[0]);
    }
    
    // 5. Ищем место выдачи (простой поиск)
    const issuedKeywords = ['ОВД', 'МВД', 'УВД', 'ФМС', 'ГУВД', 'отделом', 'отделением'];
    for (const keyword of issuedKeywords) {
        const index = cleanText.indexOf(keyword);
        if (index !== -1) {
            const issuedText = cleanText.substring(index, index + 100);
            document.getElementById(`${prefix}IssuedBy`).value = issuedText;
            console.log('Найдено место выдачи:', issuedText.substring(0, 50));
            break;
        }
    }
    
    showToast('Данные распознаны! Проверьте и откорректируйте при необходимости', 'success');
}

// Переход к ручному вводу
function skipToManualInput() {
    showStep(2);
    showToast('Переходим к ручному вводу данных', 'info');
}

// Переснять фото
function retakePhoto() {
    const fileInput = document.getElementById('passportInput');
    const previewContainer = document.getElementById('previewContainer');
    
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    
    extractedData.fileData = null;
    extractedData.rawText = null;
    
    showToast('Изображение сброшено', 'info');
}

// Управление шагами
function showStep(step) {
    console.log('Переходим к шагу', step);
    
    // Скрыть все шаги
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показать нужный шаг
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement) {
        stepElement.classList.add('active');
    } else {
        console.error('Не найден элемент шага:', step);
        return;
    }
    
    // Обновить прогресс-бар
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        if (index + 1 <= step) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });
    
    currentStep = step;
    localStorage.setItem('currentStep', step);
}

function nextStep() {
    if (currentStep < 4) showStep(currentStep + 1);
}

function previousStep() {
    if (currentStep > 1) showStep(currentStep - 1);
}

// Загрузка сохраненных данных
function loadSavedData() {
    try {
        const savedStep = localStorage.getItem('currentStep');
        if (savedStep) {
            setTimeout(() => showStep(parseInt(savedStep)), 100);
        }
        
        const savedData = localStorage.getItem('formData');
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.keys(data).forEach(key => {
                const element = document.getElementById(key);
                if (element && data[key]) {
                    element.value = data[key];
                }
            });
            console.log('Данные загружены из localStorage');
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Сохранение данных формы
function saveFormData() {
    try {
        const formData = {};
        document.querySelectorAll('input, textarea, select').forEach(element => {
            if (element.id && element.id !== 'passportInput' && element.id !== 'userRole') {
                formData[element.id] = element.value;
            }
        });
        localStorage.setItem('formData', JSON.stringify(formData));
    } catch (error) {
        console.error('Ошибка сохранения:', error);
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

// Генерация договора
async function generateContract() {
    if (!validateForm()) return;
    
    showLoading('Формируем договор...');
    
    try {
        const contractData = collectFormData();
        const response = await fetch('contract.html');
        let contractHtml = await response.text();
        
        contractHtml = replacePlaceholders(contractHtml, contractData);
        document.getElementById('contractPreview').innerHTML = contractHtml;
        
        localStorage.setItem('contractData', JSON.stringify(contractData));
        localStorage.setItem('contractHtml', contractHtml);
        
        hideLoading();
        showStep(3);
        
    } catch (error) {
        console.error('Ошибка генерации договора:', error);
        hideLoading();
        alert('Ошибка при формировании договора. Проверьте подключение к интернету.');
    }
}

// Валидация формы
function validateForm() {
    const requiredFields = ['landlordName', 'landlordPassport', 'tenantName', 'tenantPassport', 'apartmentAddress', 'rentAmount'];
    const errors = [];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            const label = field.previousElementSibling?.textContent || field.placeholder || field.name;
            errors.push(label);
            field.style.borderColor = '#e74c3c';
        }
    });
    
    if (errors.length > 0) {
        alert(`Заполните обязательные поля:\n\n• ${errors.join('\n• ')}`);
        return false;
    }
    
    return true;
}

// Сбор данных для договора
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
        
        // Счетчики
        electricityCounter: document.getElementById('electricityCounter')?.value || '_________',
        hotWaterCounter: document.getElementById('hotWaterCounter')?.value || '_________',
        coldWaterCounter: document.getElementById('coldWaterCounter')?.value || '_________',
        
        // Текущая дата
        currentDay: new Date().getDate().toString().padStart(2, '0'),
        currentMonth: new Date().toLocaleDateString('ru-RU', { month: 'long' }),
        currentYear: new Date().getFullYear(),
        currentDate: new Date().toLocaleDateString('ru-RU', {
            day: '2-digit', month: 'long', year: 'numeric'
        }),
        
        // Проживающие
        residents: residents,
        residentsList: residents.map(r => r.name).join(', ')
    };
}

// Замена плейсхолдеров
function replacePlaceholders(html, data) {
    let result = html;
    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    
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

// Создание PDF
async function downloadPDF() {
    showLoading('Создаем PDF...');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const contractDiv = document.getElementById('contractPreview');
        const canvas = await html2canvas(contractDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        
        const fileName = `Договор_аренды_${document.getElementById('tenantName').value.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
        
        hideLoading();
        showStep(4);
        
    } catch (error) {
        console.error('Ошибка создания PDF:', error);
        hideLoading();
        alert('Ошибка при создании PDF. Используйте функцию печати.');
    }
}

// Печать
function printContract() {
    const printContent = document.getElementById('contractPreview').innerHTML;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <html>
            <head>
                <title>Договор аренды</title>
                <style>
                    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; }
                    @media print {
                        .no-print { display: none; }
                        @page { margin: 15mm; }
                    }
                    .print-controls {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                </style>
            </head>
            <body>
                ${printContent}
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
    setTimeout(() => printWindow.print(), 500);
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
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(loading);
        
        const style = document.createElement('style');
        style.textContent = `
            #loadingOverlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); display: flex; align-items: center;
                justify-content: center; z-index: 9999;
            }
            .loading-content {
                background: white; padding: 40px; border-radius: 10px;
                text-align: center;
            }
            .spinner {
                border: 5px solid #f3f3f3; border-top: 5px solid #3498db;
                border-radius: 50%; width: 50px; height: 50px;
                animation: spin 1s linear infinite; margin: 0 auto 20px;
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
    if (loading) loading.style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Стили для тоста
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed; top: 20px; right: 20px; background: white;
                border-radius: 8px; padding: 15px 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 10000; transform: translateX(150%); transition: transform 0.3s ease;
                border-left: 5px solid #3498db; max-width: 400px;
            }
            .toast-success { border-left-color: #2ecc71; }
            .toast-error { border-left-color: #e74c3c; }
            .toast-info { border-left-color: #3498db; }
            .toast.show { transform: translateX(0); }
            .toast-content { display: flex; align-items: center; gap: 10px; }
            .toast i { font-size: 20px; }
            .toast-success i { color: #2ecc71; }
            .toast-error i { color: #e74c3c; }
            .toast-info i { color: #3498db; }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Добавление/удаление проживающих
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

function removeResident(button) {
    if (confirm('Удалить этого проживающего?')) {
        button.closest('.resident-item').remove();
        saveFormData();
    }
}

// Показать распознанный текст
function showDataExtractionPopup(text) {
    const popup = document.createElement('div');
    popup.className = 'data-extraction-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h3><i class="fas fa-search"></i> Распознанный текст</h3>
            <p>Вы можете скопировать нужные данные:</p>
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
    
    const style = document.createElement('style');
    style.textContent = `
        .data-extraction-popup {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 10000; padding: 20px;
        }
        .data-extraction-popup .popup-content {
            background: white; border-radius: 10px; padding: 25px;
            max-width: 800px; width: 100%; max-height: 80vh; overflow-y: auto;
        }
        .data-extraction-popup .text-preview {
            background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px;
            padding: 15px; margin: 15px 0; max-height: 300px;
            overflow-y: auto; font-family: monospace; font-size: 14px;
            line-height: 1.5;
        }
        .data-extraction-popup .popup-actions {
            display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => popup.remove(), 30000);
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
            .catch(err => alert('Не удалось скопировать текст'));
    }
}

// Конвертация числа в слова (оставьте функцию из предыдущей версии)
function numberToWordsRu(number) {
    // ... (оставьте функцию из предыдущего кода без изменений)
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

// Начать новый договор
function startNew() {
    if (confirm('Начать новый договор? Все текущие данные будут очищены.')) {
        // Очищаем форму
        document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea').forEach(input => {
            if (!input.id.includes('Counter')) {
                input.value = '';
            }
        });
        
        // Очищаем предпросмотр
        const preview = document.getElementById('passportPreview');
        const previewContainer = document.getElementById('previewContainer');
        if (preview) preview.src = '';
        if (previewContainer) previewContainer.style.display = 'none';
        
        // Очищаем договор
        const contractPreview = document.getElementById('contractPreview');
        if (contractPreview) contractPreview.innerHTML = '';
        
        // Очищаем данные
        extractedData = {};
        
        // Сбрасываем проживающих
        const residentsList = document.getElementById('residentsList');
        if (residentsList) {
            residentsList.innerHTML = `
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
        }
        
        // Устанавливаем текущие даты
        setCurrentDate();
        
        // Очищаем localStorage
        localStorage.removeItem('formData');
        localStorage.removeItem('currentStep');
        localStorage.removeItem('contractData');
        localStorage.removeItem('contractHtml');
        
        // Возвращаемся к первому шагу
        showStep(1);
        
        showToast('Начат новый договор', 'info');
    }
}