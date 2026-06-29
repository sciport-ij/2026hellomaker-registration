import { addRegistration, getRegistrations, saveCustomFields, getCustomFields } from './firebase.js';

// --- State ---
let registrations = [];
let customFields = [];
const defaultFields = [
    { id: 'name', label: '이름 / 단체명', type: 'text' },
    { id: 'contact', label: '연락처', type: 'text' },
    { id: 'tableCount', label: '테이블 수량 (개)', type: 'number' },
    { id: 'chairCount', label: '의자 수량 (개)', type: 'number' },
    { id: 'lunchCount', label: '중식 인원 (명)', type: 'number' }
];

// Combine default + custom
const getAllFields = () => [...defaultFields, ...customFields];

// Default visible columns in dashboard
let visibleColumns = new Set(['category', 'name', 'contact', 'tableCount', 'chairCount', 'lunchCount']);

// --- DOM Elements ---
const navRegister = document.getElementById('nav-register');
const navDashboard = document.getElementById('nav-dashboard');
const secRegister = document.getElementById('sec-register');
const secDashboard = document.getElementById('sec-dashboard');

const catBtns = document.querySelectorAll('.cat-btn');
const regForm = document.getElementById('registration-form');
const categoryInput = document.getElementById('maker-category');
const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');

// Dashboard DOM
const btnAddField = document.getElementById('btn-add-field');
const addFieldModal = document.getElementById('add-field-modal');
const btnConfirmAddField = document.getElementById('btn-confirm-add-field');
const btnCancelAddField = document.getElementById('btn-cancel-add-field');
const tableHeadRow = document.getElementById('table-head-row');
const tableBody = document.getElementById('table-body');
const statsContainer = document.getElementById('stats-container');
const columnToggles = document.getElementById('column-toggles');

// --- Initialization ---
async function init() {
    customFields = await getCustomFields();
    customFields.forEach(f => visibleColumns.add(f.id)); // show custom fields by default
    renderFormFields();
}

// --- Navigation ---
navRegister.addEventListener('click', () => {
    navRegister.classList.add('active');
    navDashboard.classList.remove('active');
    secRegister.classList.remove('hidden');
    secDashboard.classList.add('hidden');
});

navDashboard.addEventListener('click', async () => {
    navDashboard.classList.add('active');
    navRegister.classList.remove('active');
    secDashboard.classList.remove('hidden');
    secRegister.classList.add('hidden');
    await refreshDashboard();
});

// --- Category Selection ---
catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        categoryInput.value = btn.dataset.type;
        regForm.classList.remove('hidden');
        
        // Add subtle animation to form
        regForm.style.animation = 'none';
        setTimeout(() => regForm.style.animation = 'fadeIn 0.5s ease forwards', 10);
    });
});

// --- Dynamic Form Rendering ---
function renderFormFields() {
    dynamicFieldsContainer.innerHTML = '';
    const fields = getAllFields();
    
    fields.forEach(field => {
        const group = document.createElement('div');
        group.classList.add('input-group');
        
        const label = document.createElement('label');
        label.htmlFor = `input-${field.id}`;
        label.textContent = field.label;
        
        const input = document.createElement('input');
        input.type = field.type === 'number' ? 'number' : 'text';
        input.id = `input-${field.id}`;
        input.name = field.id;
        input.required = true;
        if(field.type === 'number') input.min = 0;
        
        group.appendChild(label);
        group.appendChild(input);
        dynamicFieldsContainer.appendChild(group);
    });
}

// --- Form Submission ---
regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(regForm);
    const data = Object.fromEntries(formData.entries());
    
    // Parse numbers
    getAllFields().forEach(f => {
        if(f.type === 'number' && data[f.id]) {
            data[f.id] = parseInt(data[f.id], 10);
        }
    });

    data.timestamp = Date.now();

    const submitBtn = regForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '처리 중...';
    submitBtn.disabled = true;

    try {
        await addRegistration(data);
        alert('성공적으로 등록되었습니다!');
        regForm.reset();
        catBtns.forEach(b => b.classList.remove('selected'));
        regForm.classList.add('hidden');
    } catch (err) {
        alert('등록 중 오류가 발생했습니다.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// --- Dashboard ---
async function refreshDashboard() {
    registrations = await getRegistrations();
    renderColumnToggles();
    renderStats();
    renderTable();
}

// 1. Column Visibility Toggles
function renderColumnToggles() {
    columnToggles.innerHTML = '';
    
    // Category is always a field
    const all = [{id: 'category', label: '메이커 구분'}, ...getAllFields()];
    
    all.forEach(field => {
        const label = document.createElement('label');
        label.classList.add('checkbox-label');
        if (visibleColumns.has(field.id)) label.classList.add('active-filter');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = visibleColumns.has(field.id);
        checkbox.dataset.id = field.id;
        
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                visibleColumns.add(field.id);
                label.classList.add('active-filter');
            } else {
                visibleColumns.delete(field.id);
                label.classList.remove('active-filter');
            }
            renderTable();
        });
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + field.label));
        columnToggles.appendChild(label);
    });
}

// 2. Stats Calculation
function renderStats() {
    statsContainer.innerHTML = '';
    
    const numberFields = getAllFields().filter(f => f.type === 'number');
    
    // Calculate total count
    createStatCard('전체 등록 수', registrations.length + '팀');
    
    numberFields.forEach(field => {
        const total = registrations.reduce((sum, reg) => sum + (Number(reg[field.id]) || 0), 0);
        createStatCard(field.label, total);
    });
}

function createStatCard(label, value) {
    const card = document.createElement('div');
    card.classList.add('stat-card');
    card.innerHTML = `
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
    `;
    statsContainer.appendChild(card);
}

// 3. Table Rendering
function renderTable() {
    tableHeadRow.innerHTML = '';
    tableBody.innerHTML = '';
    
    const all = [{id: 'category', label: '메이커 구분'}, ...getAllFields()];
    const activeFields = all.filter(f => visibleColumns.has(f.id));
    
    // Header
    activeFields.forEach(f => {
        const th = document.createElement('th');
        th.textContent = f.label;
        tableHeadRow.appendChild(th);
    });
    
    // Body
    registrations.forEach(reg => {
        const tr = document.createElement('tr');
        activeFields.forEach(f => {
            const td = document.createElement('td');
            td.textContent = reg[f.id] || '-';
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// --- Add Custom Field Modal ---
btnAddField.addEventListener('click', () => {
    addFieldModal.classList.remove('hidden');
});

btnCancelAddField.addEventListener('click', () => {
    addFieldModal.classList.add('hidden');
    document.getElementById('new-field-id').value = '';
    document.getElementById('new-field-name').value = '';
});

btnConfirmAddField.addEventListener('click', async () => {
    const idInput = document.getElementById('new-field-id').value.trim();
    const nameInput = document.getElementById('new-field-name').value.trim();
    const typeInput = document.getElementById('new-field-type').value;
    
    if(!idInput || !nameInput) {
        alert('식별자와 항목 이름을 모두 입력해주세요.');
        return;
    }
    
    const newField = { id: idInput, label: nameInput, type: typeInput };
    customFields.push(newField);
    
    await saveCustomFields(customFields);
    
    visibleColumns.add(idInput);
    renderFormFields();
    
    if (!secDashboard.classList.contains('hidden')) {
        await refreshDashboard();
    }
    
    btnCancelAddField.click(); // Close modal
});

// Boot
init();
