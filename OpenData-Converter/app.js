/**
 * Конвертер открытых данных (Методические рекомендации 4.0)
 * Основное приложение
 */

// Глобальное состояние приложения
const appState = {
    currentSection: null,
    sections: [],
    userInfo: {
        name: '',
        department: '',
        phone: '',
        email: ''
    },
    currentStep: 1,
    files: {
        order: null,
        registry: null,
        etalon: null,
        data: null
    },
    registryData: [],
    filteredDatasets: [],
    selectedDataset: null,
    structure: [],
    passport: {},
    logs: [],
    archive: [],
    currentPage: 1,
    itemsPerPage: 10
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadSections();
    loadUserInfo();
    loadLogs();
    setupEventListeners();
    renderSectionsList();
    updateUserInfoDisplay();
});

// Загрузка разделов из localStorage
function loadSections() {
    const saved = localStorage.getItem('od_sections');
    if (saved) {
        appState.sections = JSON.parse(saved);
    }
}

// Сохранение разделов в localStorage
function saveSections() {
    localStorage.setItem('od_sections', JSON.stringify(appState.sections));
}

// Загрузка информации о пользователе
function loadUserInfo() {
    const saved = localStorage.getItem('od_userInfo');
    if (saved) {
        appState.userInfo = JSON.parse(saved);
    }
}

// Сохранение информации о пользователе
function saveUserInfo() {
    localStorage.setItem('od_userInfo', JSON.stringify(appState.userInfo));
}

// Загрузка журнала действий
function loadLogs() {
    const saved = localStorage.getItem('od_logs');
    if (saved) {
        appState.logs = JSON.parse(saved);
    }
}

// Сохранение журнала действий
function saveLogs() {
    localStorage.setItem('od_logs', JSON.stringify(appState.logs));
}

// Добавление записи в журнал
function addLog(action, details = '') {
    const entry = {
        timestamp: new Date().toISOString(),
        action: action,
        details: details,
        user: appState.userInfo.name || 'Аноним',
        department: appState.userInfo.department || '',
        ip: 'local' // В браузерной версии IP недоступен
    };
    appState.logs.unshift(entry);
    // Храним последние 1000 записей
    if (appState.logs.length > 1000) {
        appState.logs = appState.logs.slice(0, 1000);
    }
    saveLogs();
    console.log(`[LOG] ${entry.timestamp} - ${action}: ${details}`);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки приветственного экрана
    document.getElementById('btnCreateNewSection').addEventListener('click', createNewSection);
    document.getElementById('btnImportSection').addEventListener('click', () => {
        document.getElementById('importSectionFile').click();
    });
    document.getElementById('importSectionFile').addEventListener('change', importSection);
    
    // Навигация
    document.getElementById('btnBackToWelcome').addEventListener('click', showWelcomeScreen);
    document.getElementById('btnExportSection').addEventListener('click', exportSection);
    document.getElementById('btnViewLogs').addEventListener('click', showLogs);
    document.getElementById('btnArchive').addEventListener('click', showArchive);
    
    // Редактирование информации пользователя
    document.getElementById('btnEditUserInfo').addEventListener('click', editUserInfo);
    document.getElementById('userInfoForm').addEventListener('submit', saveUserInfoForm);
    
    // Навигация по шагам
    document.querySelectorAll('.step-item').forEach(item => {
        item.addEventListener('click', function() {
            const step = parseInt(this.dataset.step);
            if (canNavigateToStep(step)) {
                goToStep(step);
            }
        });
    });
    
    // Кнопки перехода между шагами
    document.getElementById('btnStep1Next').addEventListener('click', () => goToStep(2));
    document.getElementById('btnStep2Prev').addEventListener('click', () => goToStep(1));
    document.getElementById('btnStep2Next').addEventListener('click', () => goToStep(3));
    document.getElementById('btnStep3Prev').addEventListener('click', () => goToStep(2));
    document.getElementById('btnStep3Next').addEventListener('click', () => goToStep(4));
    document.getElementById('btnStep4Prev').addEventListener('click', () => goToStep(3));
    document.getElementById('btnStep4Next').addEventListener('click', () => goToStep(5));
    document.getElementById('btnStep5Prev').addEventListener('click', () => goToStep(4));
    
    // Загрузка файлов
    setupFileUploads();
    
    // Поиск и фильтрация
    document.getElementById('datasetSearch').addEventListener('input', filterDatasets);
    document.getElementById('filterOwner').addEventListener('change', filterDatasets);
    document.getElementById('filterStatus').addEventListener('change', filterDatasets);
    document.getElementById('btnClearSearch').addEventListener('click', clearSearch);
    document.getElementById('btnResetFilters').addEventListener('click', resetFilters);
    
    // Вкладки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Паспорт
    document.getElementById('btnAutoFillPassport').addEventListener('click', autoFillPassport);
    document.getElementById('btnValidatePassport').addEventListener('click', validatePassport);
    
    // Конвертация
    document.getElementById('btnConvert').addEventListener('click', convertAndDownload);
    
    // Справка
    document.querySelectorAll('.help-icon, .tooltip-icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            showHelp(this.dataset.help || this.title);
        });
    });
    
    // Закрытие модальных окон по клику на overlay
    document.getElementById('modalOverlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// Создание нового раздела
function createNewSection() {
    const sectionName = prompt('Введите название раздела (например, "Бюджетные данные 2024"):');
    if (!sectionName) return;
    
    const section = {
        id: Date.now().toString(),
        name: sectionName,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        orderVersion: null,
        datasets: [],
        files: {},
        passport: {},
        structure: [],
        status: 'active'
    };
    
    appState.currentSection = section;
    appState.sections.push(section);
    saveSections();
    
    addLog('CREATE_SECTION', `Создан раздел: ${sectionName}`);
    
    enterSection(section.id);
}

// Вход в раздел
function enterSection(sectionId) {
    const section = appState.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    appState.currentSection = section;
    document.getElementById('currentSectionName').textContent = `Раздел: ${section.name}`;
    document.getElementById('welcomeScreen').classList.remove('active');
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('active');
    
    addLog('ENTER_SECTION', `Вход в раздел: ${section.name}`);
    
    goToStep(1);
}

// Отображение списка разделов
function renderSectionsList() {
    const container = document.getElementById('sectionsList');
    const block = document.getElementById('existingSectionsBlock');
    
    if (appState.sections.length === 0) {
        block.classList.add('hidden');
        return;
    }
    
    block.classList.remove('hidden');
    container.innerHTML = appState.sections.map(section => `
        <div class="section-item" onclick="enterSection('${section.id}')">
            <strong>${escapeHtml(section.name)}</strong>
            <div style="font-size: 0.75rem; color: #6b7280;">
                Создан: ${new Date(section.created).toLocaleDateString('ru-RU')}
                ${section.orderVersion ? `| Приказ: ${section.orderVersion}` : ''}
            </div>
        </div>
    `).join('');
}

// Экспорт раздела
function exportSection() {
    if (!appState.currentSection) return;
    
    const sectionData = JSON.stringify(appState.currentSection, null, 2);
    const blob = new Blob([sectionData], { type: 'application/json' });
    const filename = `section_${appState.currentSection.name.replace(/[^a-z0-9]/gi, '_')}.odsection`;
    
    saveAs(blob, filename);
    addLog('EXPORT_SECTION', `Экспорт раздела: ${appState.currentSection.name}`);
}

// Импорт раздела
function importSection(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const section = JSON.parse(e.target.result);
            if (!section.id || !section.name) {
                throw new Error('Неверный формат файла');
            }
            
            // Генерируем новый ID чтобы избежать конфликтов
            section.id = Date.now().toString();
            section.updated = new Date().toISOString();
            
            appState.sections.push(section);
            saveSections();
            
            addLog('IMPORT_SECTION', `Импорт раздела: ${section.name}`);
            alert('Раздел успешно импортирован!');
            renderSectionsList();
        } catch (err) {
            alert('Ошибка импорта: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Показ приветственного экрана
function showWelcomeScreen() {
    document.getElementById('mainScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('welcomeScreen').classList.remove('hidden');
    document.getElementById('welcomeScreen').classList.add('active');
    appState.currentSection = null;
    renderSectionsList();
}

// Переход к шагу
function goToStep(step) {
    if (!canNavigateToStep(step)) {
        alert('Сначала выполните обязательные действия текущего шага');
        return;
    }
    
    appState.currentStep = step;
    
    // Обновляем навигацию
    document.querySelectorAll('.step-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.step) === step);
    });
    
    // Показываем нужный контент
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.toggle('active', content.id === `step${step}`);
        content.classList.toggle('hidden', content.id !== `step${step}`);
    });
    
    addLog('NAVIGATE_STEP', `Переход к шагу ${step}`);
    
    // Специфичные действия для шагов
    if (step === 2) {
        renderDatasetsTable();
    } else if (step === 4) {
        renderStructureTable();
    } else if (step === 5) {
        updateConversionChecklist();
    }
}

// Проверка возможности перехода
function canNavigateToStep(step) {
    if (step === 1) return true;
    if (step === 2) return appState.files.registry !== null;
    if (step === 3) return appState.selectedDataset !== null;
    if (step === 4) return appState.files.data !== null;
    if (step === 5) return appState.structure.length > 0;
    return false;
}

// Настройка загрузки файлов
function setupFileUploads() {
    // Приказ
    document.getElementById('orderFile').addEventListener('change', function(e) {
        handleFileUpload(e, 'order', 'orderFileInfo');
    });
    
    // Реестр
    document.getElementById('registryFile').addEventListener('change', function(e) {
        handleFileUpload(e, 'registry', 'registryFileInfo', processRegistry);
    });
    
    // Эталон
    document.getElementById('etalonFile').addEventListener('change', function(e) {
        handleFileUpload(e, 'etalon', 'etalonFileInfo', processEtalon);
    });
    
    // Данные
    document.getElementById('dataFile').addEventListener('change', function(e) {
        handleFileUpload(e, 'data', 'dataFileInfo', processData);
    });
}

// Обработка загрузки файла
function handleFileUpload(event, fileType, infoId, callback) {
    const file = event.target.files[0];
    if (!file) return;
    
    appState.files[fileType] = file;
    
    const infoDiv = document.getElementById(infoId);
    infoDiv.classList.remove('hidden');
    infoDiv.innerHTML = `
        <strong>✅ Файл загружен:</strong> ${file.name}<br>
        <small>Размер: ${(file.size / 1024).toFixed(2)} KB</small>
    `;
    
    addLog('FILE_UPLOADED', `${fileType}: ${file.name}`);
    
    if (callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            callback(e.target.result, file);
        };
        
        // Читаем как текст JSON файлы и CSV/TXT для эталона
        if (fileType === 'etalon' && (file.name.endsWith('.json') || file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
            reader.readAsText(file);
        } else if (fileType === 'data' && (file.name.endsWith('.json') || file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }
    
    // Проверяем готовность к переходу
    if (fileType === 'registry') {
        document.getElementById('btnStep1Next').disabled = false;
    }
}

// Обработка реестра
function processRegistry(data, file) {
    try {
        let workbook;
        
        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
            // Парсим CSV/TXT
            const text = new TextDecoder('utf-8').decode(data);
            const result = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                delimiter: '' // Автоопределение
            });
            
            appState.registryData = result.data.map((row, idx) => ({
                id: row.id || row.ID || `DS-${idx + 1}`,
                name: row.name || row.naimenovanie || row['Наименование'] || 'Без названия',
                owner: row.owner || row.vladelets || row['Владелец'] || '',
                responsible: row.responsible || row.otvetstvennoe_litso || row['Ответственное лицо'] || '',
                status: row.status === 'archive' || row.status === 'Архив' ? 'archive' : 'active',
                description: row.description || row.opisanie || row['Описание'] || ''
            }));
        } else {
            // Парсим Excel
            workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            appState.registryData = jsonData.map((row, idx) => ({
                id: row.id || row.ID || `DS-${idx + 1}`,
                name: row.name || row.naimenovanie || row['Наименование'] || 'Без названия',
                owner: row.owner || row.vladelets || row['Владелец'] || '',
                responsible: row.responsible || row.otvetstvennoe_litso || row['Ответственное лицо'] || '',
                status: row.status === 'archive' || row.status === 'Архив' ? 'archive' : 'active',
                description: row.description || row.opisanie || row['Описание'] || ''
            }));
        }
        
        appState.filteredDatasets = [...appState.registryData];
        populateOwnerFilter();
        renderDatasetsTable();
        
        addLog('REGISTRY_PROCESSED', `Загружено ${appState.registryData.length} наборов данных`);
        
    } catch (err) {
        console.error('Ошибка обработки реестра:', err);
        alert('Ошибка при обработке реестра: ' + err.message);
    }
}

// Обработка эталонной структуры
function processEtalon(data, file) {
    try {
        if (file.name.endsWith('.json')) {
            // JSON файл - читаем как текст
            const text = typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
            appState.etalonStructure = JSON.parse(text);
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
            // CSV/TXT - парсим как таблицу
            const text = new TextDecoder('utf-8').decode(data);
            const result = Papa.parse(text, {
                header: true,
                skipEmptyLines: true
            });
            appState.etalonStructure = result.data;
        } else {
            // Excel/ODS
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            appState.etalonStructure = XLSX.utils.sheet_to_json(firstSheet);
        }
        
        addLog('ETALON_PROCESSED', `Эталонная структура загружена: ${file.name}`);
        
    } catch (err) {
        console.error('Ошибка обработки эталона:', err);
        alert('Ошибка при обработке эталонной структуры: ' + err.message);
    }
}

// Обработка файла данных
function processData(data, file) {
    try {
        let workbook, jsonData;
        
        if (file.name.endsWith('.json')) {
            // JSON файл - читаем как текст
            const text = typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
            jsonData = JSON.parse(text);
            // Если это массив - используем его, если объект - пробуем найти массив внутри
            if (!Array.isArray(jsonData)) {
                // Пытаемся найти массив в полях объекта
                for (const key of Object.keys(jsonData)) {
                    if (Array.isArray(jsonData[key])) {
                        jsonData = jsonData[key];
                        break;
                    }
                }
                if (!Array.isArray(jsonData)) {
                    jsonData = [jsonData]; // Превращаем объект в массив из одного элемента
                }
            }
            appState.dataHeaders = Object.keys(jsonData[0] || {});
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
            const text = new TextDecoder('utf-8').decode(data);
            const result = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                delimiter: '' // Автоопределение
            });
            jsonData = result.data;
            appState.dataHeaders = result.meta.fields || [];
        } else {
            workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            jsonData = XLSX.utils.sheet_to_json(firstSheet);
            appState.dataHeaders = Object.keys(jsonData[0] || {});
        }
        
        appState.dataRows = jsonData;
        
        // Показываем превью
        showDataPreview(jsonData);
        
        // Генерируем структуру
        generateStructure(jsonData);
        
        // Проверяем соответствие эталону
        if (appState.etalonStructure) {
            validateAgainstEtalon();
        }
        
        addLog('DATA_PROCESSED', `Данные загружены: ${jsonData.length} строк, ${appState.dataHeaders.length} столбцов`);
        
    } catch (err) {
        console.error('Ошибка обработки данных:', err);
        alert('Ошибка при обработке файла данных: ' + err.message);
    }
}

// Показ превью данных
function showDataPreview(data) {
    const previewDiv = document.getElementById('dataPreview');
    previewDiv.classList.remove('hidden');
    
    const table = document.getElementById('previewTable');
    const headers = appState.dataHeaders || Object.keys(data[0] || {});
    
    let html = '<thead><tr>';
    headers.forEach(h => {
        html += `<th>${escapeHtml(h)}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Показываем первые 5 строк
    data.slice(0, 5).forEach(row => {
        html += '<tr>';
        headers.forEach(h => {
            html += `<td>${escapeHtml(String(row[h] || ''))}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';
    
    table.innerHTML = html;
}

// Генерация структуры
function generateStructure(data) {
    if (!data || data.length === 0) return;
    
    const sampleRow = data[0];
    const headers = Object.keys(sampleRow);
    
    appState.structure = headers.map(field => {
        const value = sampleRow[field];
        let type = 'string';
        
        if (value === null || value === undefined || value === '') {
            type = 'string';
        } else if (typeof value === 'number') {
            type = 'number';
        } else if (typeof value === 'boolean') {
            type = 'boolean';
        } else if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\.\d{2}\.\d{4}/.test(value)) {
                type = 'date';
            } else if (/^-?\d+(\.\d+)?$/.test(value)) {
                type = 'number';
            } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                type = 'boolean';
            }
        }
        
        // Пытаемся найти описание в эталоне
        let description = `Поле "${field}"`;
        let required = false;
        let example = String(value || '');
        
        if (appState.etalonStructure) {
            const etalonField = appState.etalonStructure.find(f => 
                f.fieldname === field || f.name === field || f['Наименование поля'] === field
            );
            if (etalonField) {
                description = etalonField.description || etalonField.opisanie || etalonField['Описание'] || description;
                required = etalonField.required === true || etalonField.obligatory === 'да' || etalonField['Обязательное поле'] === 'да';
                if (etalonField.example || etalonField.primer || etalonField['Пример']) {
                    example = etalonField.example || etalonField.primer || etalonField['Пример'];
                }
            }
        }
        
        return {
            fieldname: field,
            description: description,
            type: type,
            required: required,
            example: example.substring(0, 50)
        };
    });
    
    renderStructureTable();
}

// Рендер таблицы структуры
function renderStructureTable() {
    const tbody = document.getElementById('structureTableBody');
    
    tbody.innerHTML = appState.structure.map(field => `
        <tr>
            <td><code>${escapeHtml(field.fieldname)}</code></td>
            <td>${escapeHtml(field.description)}</td>
            <td><span class="status-badge ${getTypeBadgeClass(field.type)}">${field.type}</span></td>
            <td>${field.required ? '✅ Да' : 'Нет'}</td>
            <td><code>${escapeHtml(field.example)}</code></td>
        </tr>
    `).join('');
}

function getTypeBadgeClass(type) {
    const classes = {
        'string': 'status-active',
        'number': 'status-archive',
        'date': 'status-active',
        'boolean': 'status-archive'
    };
    return classes[type] || 'status-archive';
}

// Валидация против эталона
function validateAgainstEtalon() {
    const etalonFields = appState.etalonStructure.map(f => 
        f.fieldname || f.name || f['Наименование поля']
    ).filter(Boolean);
    
    const dataFields = appState.dataHeaders;
    
    const missing = etalonFields.filter(f => !dataFields.includes(f));
    const extra = dataFields.filter(f => !etalonFields.includes(f));
    
    const validationDiv = document.getElementById('validationResult');
    const detailsDiv = document.getElementById('validationDetails');
    
    if (missing.length === 0 && extra.length === 0) {
        validationDiv.classList.remove('hidden');
        validationDiv.style.background = '#f0fdf4';
        validationDiv.style.borderColor = '#10b981';
        detailsDiv.innerHTML = '<p style="color: #065f46;"><strong>✅ Отлично!</strong> Все поля соответствуют эталонной структуре.</p>';
    } else {
        validationDiv.classList.remove('hidden');
        validationDiv.style.background = '#fef3c7';
        validationDiv.style.borderColor = '#f59e0b';
        
        let html = '<ul>';
        if (missing.length > 0) {
            html += '<li style="color: #dc2626;"><strong>❌ Отсутствуют поля:</strong> ' + missing.join(', ') + '</li>';
        }
        if (extra.length > 0) {
            html += '<li style="color: #f59e0b;"><strong>⚠️ Лишние поля:</strong> ' + extra.join(', ') + '</li>';
        }
        html += '</ul>';
        detailsDiv.innerHTML = html;
    }
}

// Рендер таблицы наборов данных
function renderDatasetsTable() {
    const tbody = document.getElementById('datasetsTableBody');
    const start = (appState.currentPage - 1) * appState.itemsPerPage;
    const end = start + appState.itemsPerPage;
    const pageData = appState.filteredDatasets.slice(start, end);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Наборы данных не найдены</td></tr>';
    } else {
        tbody.innerHTML = pageData.map(ds => `
            <tr onclick="selectDataset('${ds.id}')" class="${appState.selectedDataset?.id === ds.id ? 'selected' : ''}">
                <td><strong>${escapeHtml(ds.id)}</strong></td>
                <td>${escapeHtml(ds.name)}</td>
                <td>${escapeHtml(ds.owner)}</td>
                <td>${escapeHtml(ds.responsible)}</td>
                <td><span class="status-badge ${ds.status === 'active' ? 'status-active' : 'status-archive'}">${ds.status === 'active' ? 'Действующий' : 'Архив'}</span></td>
                <td>${escapeHtml(ds.description.substring(0, 100))}${ds.description.length > 100 ? '...' : ''}</td>
            </tr>
        `).join('');
    }
    
    updateResultsCount();
    renderPagination();
}

// Выбор набора данных
function selectDataset(datasetId) {
    const dataset = appState.registryData.find(d => d.id === datasetId);
    if (!dataset) return;
    
    if (dataset.status === 'archive') {
        if (!confirm('Внимание! Вы выбираете архивный набор данных. Продолжить?')) {
            return;
        }
    }
    
    appState.selectedDataset = dataset;
    renderDatasetsTable();
    
    // Показываем информацию
    const infoDiv = document.getElementById('selectedDatasetInfo');
    infoDiv.classList.remove('hidden');
    document.getElementById('selDatasetId').textContent = dataset.id;
    document.getElementById('selDatasetName').textContent = dataset.name;
    document.getElementById('selDatasetOwner').textContent = dataset.owner;
    document.getElementById('selDatasetResponsible').textContent = dataset.responsible;
    document.getElementById('selDatasetStatus').textContent = dataset.status === 'active' ? 'Действующий' : 'Архив';
    document.getElementById('selDatasetDescription').textContent = dataset.description;
    
    addLog('SELECT_DATASET', `Выбран набор: ${dataset.id} - ${dataset.name}`);
    
    // Разблокируем кнопку перехода
    document.getElementById('btnStep2Next').disabled = false;
}

// Фильтрация наборов
function filterDatasets() {
    const search = document.getElementById('datasetSearch').value.toLowerCase();
    const ownerFilter = document.getElementById('filterOwner').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    appState.filteredDatasets = appState.registryData.filter(ds => {
        const matchesSearch = !search || ds.name.toLowerCase().includes(search) || ds.id.toLowerCase().includes(search);
        const matchesOwner = !ownerFilter || ds.owner === ownerFilter;
        const matchesStatus = !statusFilter || ds.status === statusFilter;
        
        return matchesSearch && matchesOwner && matchesStatus;
    });
    
    appState.currentPage = 1;
    renderDatasetsTable();
    updateActiveFilters();
}

// Заполнение фильтра владельцев
function populateOwnerFilter() {
    const owners = [...new Set(appState.registryData.map(ds => ds.owner).filter(Boolean))];
    const select = document.getElementById('filterOwner');
    
    select.innerHTML = '<option value="">Все владельцы</option>' + 
        owners.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
}

// Обновление счетчика результатов
function updateResultsCount() {
    document.getElementById('resultsCount').textContent = 
        `Найдено: ${appState.filteredDatasets.length} набор(а/ов)`;
}

// Рендер пагинации
function renderPagination() {
    const totalPages = Math.ceil(appState.filteredDatasets.length / appState.itemsPerPage);
    const paginationDiv = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Кнопка "Назад"
    html += `<button onclick="changePage(${appState.currentPage - 1})" ${appState.currentPage === 1 ? 'disabled' : ''}>← Назад</button>`;
    
    // Номера страниц
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= appState.currentPage - 2 && i <= appState.currentPage + 2)) {
            html += `<button onclick="changePage(${i})" class="${i === appState.currentPage ? 'active' : ''}">${i}</button>`;
        } else if (i === appState.currentPage - 3 || i === appState.currentPage + 3) {
            html += '<button disabled>...</button>';
        }
    }
    
    // Кнопка "Вперед"
    html += `<button onclick="changePage(${appState.currentPage + 1})" ${appState.currentPage === totalPages ? 'disabled' : ''}>Вперед →</button>`;
    
    paginationDiv.innerHTML = html;
}

// Смена страницы
function changePage(page) {
    const totalPages = Math.ceil(appState.filteredDatasets.length / appState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    appState.currentPage = page;
    renderDatasetsTable();
}

// Обновление активных фильтров
function updateActiveFilters() {
    const container = document.getElementById('activeFilters');
    const filters = [];
    
    const search = document.getElementById('datasetSearch').value;
    const owner = document.getElementById('filterOwner').value;
    const status = document.getElementById('filterStatus').value;
    
    if (search) filters.push({ name: 'Поиск', value: search });
    if (owner) filters.push({ name: 'Владелец', value: owner });
    if (status) filters.push({ name: 'Статус', value: status === 'active' ? 'Действующий' : 'Архив' });
    
    if (filters.length === 0) {
        container.innerHTML = '';
    } else {
        container.innerHTML = filters.map(f => `
            <span class="filter-tag">
                ${f.name}: ${escapeHtml(f.value)}
                <button onclick="removeFilter('${f.name}')">×</button>
            </span>
        `).join('');
    }
}

// Удаление фильтра
function removeFilter(filterName) {
    if (filterName === 'Поиск') {
        document.getElementById('datasetSearch').value = '';
    } else if (filterName === 'Владелец') {
        document.getElementById('filterOwner').value = '';
    } else if (filterName === 'Статус') {
        document.getElementById('filterStatus').value = '';
    }
    filterDatasets();
}

// Очистка поиска
function clearSearch() {
    document.getElementById('datasetSearch').value = '';
    filterDatasets();
}

// Сброс фильтров
function resetFilters() {
    document.getElementById('datasetSearch').value = '';
    document.getElementById('filterOwner').value = '';
    document.getElementById('filterStatus').value = '';
    filterDatasets();
}

// Переключение вкладок
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        content.classList.toggle('hidden', content.id !== `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    });
}

// Автозаполнение паспорта
function autoFillPassport() {
    if (!appState.selectedDataset) {
        alert('Сначала выберите набор данных');
        return;
    }
    
    const ds = appState.selectedDataset;
    
    document.getElementById('passportId').value = ds.id;
    document.getElementById('passportTitle').value = ds.name;
    document.getElementById('passportDescription').value = ds.description;
    document.getElementById('passportOwner').value = ds.owner;
    document.getElementById('passportResponsible').value = ds.responsible;
    
    // Если есть информация о пользователе
    if (appState.userInfo.phone) {
        document.getElementById('passportPhone').value = appState.userInfo.phone;
    }
    if (appState.userInfo.email) {
        document.getElementById('passportEmail').value = appState.userInfo.email;
    }
    
    // Дата актуальности - сегодня
    document.getElementById('passportActualDate').value = new Date().toISOString().split('T')[0];
    
    addLog('PASSPORT_AUTOFILL', 'Паспорт автозаполнен из реестра');
    alert('Паспорт заполнен данными из реестра!');
}

// Валидация паспорта
function validatePassport() {
    const requiredFields = [
        'passportId', 'passportTitle', 'passportDescription', 'passportOwner',
        'passportResponsible', 'passportPhone', 'passportEmail', 'passportActualDate', 'passportKeywords'
    ];
    
    let isValid = true;
    let missingFields = [];
    
    requiredFields.forEach(id => {
        const field = document.getElementById(id);
        if (!field.value.trim()) {
            isValid = false;
            missingFields.push(field.previousElementSibling?.textContent || id);
            field.style.borderColor = '#ef4444';
        } else {
            field.style.borderColor = '#e5e7eb';
        }
    });
    
    if (isValid) {
        alert('✅ Все обязательные поля заполнены корректно!');
        appState.passportValidated = true;
        updateConversionChecklist();
    } else {
        alert('❌ Не заполнены обязательные поля:\n' + missingFields.join('\n'));
    }
}

// Обновление чеклиста конвертации
function updateConversionChecklist() {
    document.getElementById('checkRegistry').innerHTML = 
        appState.files.registry ? '✅ Реестр загружен' : '❌ Реестр загружен';
    document.getElementById('checkDataset').innerHTML = 
        appState.selectedDataset ? '✅ Набор данных выбран' : '❌ Набор данных выбран';
    document.getElementById('checkData').innerHTML = 
        appState.files.data ? '✅ Файл данных загружен' : '❌ Файл данных загружен';
    document.getElementById('checkStructure').innerHTML = 
        appState.structure.length > 0 ? '✅ Структура сформирована' : '❌ Структура сформирована';
    document.getElementById('checkPassport').innerHTML = 
        appState.passportValidated ? '✅ Паспорт заполнен' : '❌ Паспорт заполнен';
}

// Конвертация и скачивание
async function convertAndDownload() {
    if (!appState.passportValidated) {
        alert('Сначала проверьте и заполните паспорт');
        return;
    }
    
    addLog('CONVERT_START', 'Начата конвертация данных');
    
    try {
        const zip = new JSZip();
        const format = document.getElementById('passportFormat').value;
        const filesCreated = [];
        
        // Генерируем structure.json
        const structureJson = {
            fields: appState.structure,
            generatedAt: new Date().toISOString(),
            mrVersion: '4.0'
        };
        zip.file('structure.json', JSON.stringify(structureJson, null, 2));
        filesCreated.push('structure.json');
        
        // Генерируем structure.csv
        const structureCsv = generateStructureCSV(appState.structure);
        zip.file('structure.csv', structureCsv);
        filesCreated.push('structure.csv');
        
        // Генерируем meta.json
        const metaJson = generateMetaJson();
        zip.file('meta.json', JSON.stringify(metaJson, null, 2));
        filesCreated.push('meta.json');
        
        // Генерируем data.csv
        const csvContent = Papa.unparse(appState.dataRows, {
            delimiter: ';',
            encoding: 'UTF-8'
        });
        zip.file('data.csv', csvContent);
        filesCreated.push('data.csv');
        
        // Генерируем data.json если выбрано
        if (document.getElementById('outJSON').checked) {
            zip.file('data.json', JSON.stringify(appState.dataRows, null, 2));
            filesCreated.push('data.json');
        }
        
        // Генерируем data.xml если выбрано
        if (document.getElementById('outXML').checked) {
            const xmlContent = generateXml(appState.dataRows, appState.structure);
            zip.file('data.xml', xmlContent);
            filesCreated.push('data.xml');
        }
        
        // Генерируем meta.html (человекочитаемый паспорт)
        const meta = collectPassportData();
        const htmlContent = generatePassportHTML(meta);
        zip.file('meta.html', htmlContent);
        filesCreated.push('meta.html (паспорт)');
        
        // Создаем ZIP и скачиваем
        const content = await zip.generateAsync({ type: 'blob' });
        const filename = `od_${appState.selectedDataset.id}_${new Date().toISOString().split('T')[0]}.zip`;
        
        saveAs(content, filename);
        
        // Показываем результат
        const resultDiv = document.getElementById('conversionResult');
        resultDiv.classList.remove('hidden');
        document.getElementById('resultFilesList').innerHTML = 
            filesCreated.map(f => `<li>📄 ${f}</li>`).join('');
        
        addLog('CONVERT_COMPLETE', `Конвертация завершена. Файлов: ${filesCreated.length}`);
        alert('✅ Конвертация завершена! Архив скачан.');
        
    } catch (err) {
        console.error('Ошибка конвертации:', err);
        alert('Ошибка при конвертации: ' + err.message);
        addLog('CONVERT_ERROR', err.message);
    }
}

// Генерация meta.json по МР 4.0
function generateMetaJson() {
    return {
        version: '4.0',
        id: document.getElementById('passportId').value,
        title: document.getElementById('passportTitle').value,
        description: document.getElementById('passportDescription').value,
        owner: document.getElementById('passportOwner').value,
        responsiblePerson: {
            name: document.getElementById('passportResponsible').value,
            phone: document.getElementById('passportPhone').value,
            email: document.getElementById('passportEmail').value
        },
        format: document.getElementById('passportFormat').value,
        firstPublishDate: document.getElementById('passportFirstPublish').value || new Date().toISOString().split('T')[0],
        lastUpdateDate: document.getElementById('passportLastUpdate').value || new Date().toISOString().split('T')[0],
        actualDate: document.getElementById('passportActualDate').value,
        keywords: document.getElementById('passportKeywords').value.split(',').map(k => k.trim()),
        lastChangeDescription: document.getElementById('passportLastChange').value || 'Первичная публикация',
        structure: appState.structure.map(f => ({
            fieldname: f.fieldname,
            description: f.description,
            type: f.type,
            required: f.required
        })),
        createdAt: new Date().toISOString(),
        createdBy: appState.userInfo.name || 'Аноним'
    };
}

// Генерация XML
function generateXml(data, structure) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';
    
    data.forEach(row => {
        xml += '  <record>\n';
        structure.forEach(field => {
            const value = row[field.fieldname] !== undefined ? row[field.fieldname] : '';
            xml += `    <${field.fieldname}>${escapeXml(String(value))}</${field.fieldname}>\n`;
        });
        xml += '  </record>\n';
    });
    
    xml += '</data>';
    return xml;
}

// Генерация CSV структуры
function generateStructureCSV(structure) {
    const headers = ["fieldname", "description", "type", "format", "required", "example"];
    const rows = structure.map(field => [
        field.fieldname,
        field.description || "",
        field.type || "string",
        field.format || "",
        field.required ? "true" : "false",
        field.example || ""
    ]);
    
    return Papa.unparse({
        fields: headers,
        data: rows
    }, {
        delimiter: ";",
        header: true
    });
}

// Генерация HTML паспорта (человекочитаемый формат)
function generatePassportHTML(meta) {
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Паспорт набора данных: ${meta.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #7f8c8d; display: block; }
        .value { color: #2c3e50; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #bdc3c7; padding: 10px; text-align: left; }
        th { background-color: #ecf0f1; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #bdc3c7; font-size: 0.9em; color: #7f8c8d; }
    </style>
</head>
<body>
    <h1>Паспорт набора открытых данных</h1>
    
    <div class="field"><span class="label">Версия методических рекомендаций:</span><span class="value">${meta.version}</span></div>
    <div class="field"><span class="label">Идентификационный номер:</span><span class="value">${meta.id || 'Не присвоен'}</span></div>
    <div class="field"><span class="label">Наименование набора:</span><span class="value">${meta.title}</span></div>
    <div class="field"><span class="label">Описание:</span><span class="value">${meta.description}</span></div>
    
    <h2>Владелец и ответственное лицо</h2>
    <div class="field"><span class="label">Владелец:</span><span class="value">${meta.owner}</span></div>
    <div class="field"><span class="label">Ответственное лицо:</span><span class="value">${meta.responsiblePerson.name}</span></div>
    <div class="field"><span class="label">Телефон:</span><span class="value">${meta.responsiblePerson.phone || 'Не указан'}</span></div>
    <div class="field"><span class="label">E-mail:</span><span class="value">${meta.responsiblePerson.email || 'Не указан'}</span></div>
    
    <h2>Даты и версия</h2>
    <div class="field"><span class="label">Дата первой публикации:</span><span class="value">${meta.firstPublishDate}</span></div>
    <div class="field"><span class="label">Дата последнего изменения:</span><span class="value">${meta.lastUpdateDate}</span></div>
    <div class="field"><span class="label">Дата актуальности:</span><span class="value">${meta.actualDate}</span></div>
    <div class="field"><span class="label">Содержание последнего изменения:</span><span class="value">${meta.lastChangeDescription}</span></div>
    
    <h2>Ключевые слова</h2>
    <div class="field"><span class="value">${meta.keywords.join(', ')}</span></div>
    
    <h2>Структура данных</h2>
    <table>
        <thead><tr><th>Поле</th><th>Тип</th><th>Описание</th><th>Обязательно</th></tr></thead>
        <tbody>
            ${meta.structure.map(f => `
                <tr>
                    <td>${f.fieldname}</td>
                    <td>${f.type}</td>
                    <td>${f.description || '-'}</td>
                    <td>${f.required ? 'Да' : 'Нет'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        Сгенерировано автоматически Конвертером Открытых Данных (МР 4.0)<br>
        Дата формирования: ${new Date().toLocaleDateString('ru-RU')}<br>
        Пользователь: ${meta.createdBy}
    </div>
</body>
</html>`;
    return html;
}

// Вспомогательные функции
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Модальные окна
function editUserInfo() {
    document.getElementById('editUserName').value = appState.userInfo.name;
    document.getElementById('editUserDepartment').value = appState.userInfo.department;
    document.getElementById('editUserPhone').value = appState.userInfo.phone;
    document.getElementById('editUserEmail').value = appState.userInfo.email;
    
    openModal('userInfoModal');
}

function saveUserInfoForm(e) {
    e.preventDefault();
    
    appState.userInfo.name = document.getElementById('editUserName').value;
    appState.userInfo.department = document.getElementById('editUserDepartment').value;
    appState.userInfo.phone = document.getElementById('editUserPhone').value;
    appState.userInfo.email = document.getElementById('editUserEmail').value;
    
    saveUserInfo();
    updateUserInfoDisplay();
    closeModal();
    
    addLog('USER_INFO_UPDATED', 'Информация о пользователе обновлена');
}

function updateUserInfoDisplay() {
    document.getElementById('userName').textContent = appState.userInfo.name || 'Не указано';
    document.getElementById('userDepartment').textContent = appState.userInfo.department || 'Не указано';
    document.getElementById('userPhone').textContent = appState.userInfo.phone || 'Не указан';
    document.getElementById('userEmail').textContent = appState.userInfo.email || 'Не указан';
}

function showLogs() {
    const container = document.getElementById('logsContainer');
    
    if (appState.logs.length === 0) {
        container.innerHTML = '<p>Журнал пуст</p>';
    } else {
        container.innerHTML = appState.logs.map(log => `
            <div class="log-entry">
                <strong>${new Date(log.timestamp).toLocaleString('ru-RU')}</strong><br>
                <span style="color: #2563eb;">${log.action}</span>: ${log.details}<br>
                <small>Пользователь: ${log.user} (${log.department})</small>
            </div>
        `).join('');
    }
    
    openModal('logsModal');
}

function showArchive() {
    const container = document.getElementById('archiveContent');
    
    if (appState.archive.length === 0) {
        container.innerHTML = '<p>Архив приказов пуст</p>';
    } else {
        container.innerHTML = appState.archive.map(item => `
            <div class="log-entry">
                <strong>${item.orderNumber}</strong> от ${new Date(item.date).toLocaleDateString('ru-RU')}<br>
                ${item.description}
            </div>
        `).join('');
    }
    
    openModal('archiveModal');
}

function showHelp(content) {
    document.getElementById('helpModalContent').innerHTML = `<p>${content}</p>`;
    openModal('helpModal');
}

function openModal(modalId) {
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// Глобальные функции для доступа из HTML
window.enterSection = enterSection;
window.changePage = changePage;
window.removeFilter = removeFilter;
window.closeModal = closeModal;
window.selectDataset = selectDataset;
