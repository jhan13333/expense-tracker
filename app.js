/**
 * 고정비 지출 트래커 - 메인 애플리케이션
 */

// ==================== 상태 관리 ====================

const state = {
    items: [],              // FixedExpense[]
    payments: [],           // PaymentRecord[]
    currentYear: new Date().getFullYear(),  // 현재 선택된 년도
    filter: 'all',         // 'all' | 'unpaid' | 'paid'
    sort: 'name',          // 'name' | 'amount' | 'status'
    search: ''             // 검색어
};

// ==================== 유틸리티 함수 ====================

/**
 * UUID 생성 (간단한 버전)
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 현재 날짜를 YYYY-MM 형식으로 반환
 */
function getCurrentYearMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * YYYY-MM 형식의 월의 첫날과 마지막날 반환
 */
function getMonthRange(yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return {
        first: firstDay.toISOString().split('T')[0],
        last: lastDay.toISOString().split('T')[0]
    };
}

/**
 * ISO 날짜가 해당 월 범위 내에 있는지 확인
 */
function isDateInMonth(dateISO, yearMonth) {
    if (!dateISO) return false;
    const range = getMonthRange(yearMonth);
    return dateISO >= range.first && dateISO <= range.last;
}

/**
 * ISO 날짜를 YYYY-MM-DD 형식으로 변환 (이미 그 형식일 수도 있음)
 */
function formatDate(isoDate) {
    if (!isoDate) return '';
    return isoDate.split('T')[0];
}

/**
 * 숫자를 천 단위 구분자와 함께 포맷
 */
function formatAmount(amount) {
    if (!amount && amount !== 0) return '';
    return new Intl.NumberFormat('ko-KR').format(amount);
}

/**
 * 문자열 트림 및 정규화 (중복 체크용)
 */
function normalizeString(str) {
    return str.trim().toLowerCase();
}

/**
 * 날짜 문자열에서 YYYY-MM 추출
 */
function ymOf(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('T')[0].substring(0, 7);
}

/**
 * YYYY-MM 형식에 개월 수를 더함
 */
function addMonths(yearMonth, k) {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + k, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${newYear}-${newMonth}`;
}

// ==================== Storage 관리 ====================

const STORAGE_KEYS = {
    ITEMS: 'fx:items:v1',
    PAYMENTS: 'fx:payments:v1',
    UI: 'fx:ui:v1'
};

/**
 * localStorage에서 데이터 로드
 */
function loadFromStorage() {
    try {
        const itemsJson = localStorage.getItem(STORAGE_KEYS.ITEMS);
        const paymentsJson = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
        const uiJson = localStorage.getItem(STORAGE_KEYS.UI);

        if (itemsJson) {
            state.items = JSON.parse(itemsJson);
        } else {
            // 첫 방문 시 예시 항목 추가
            state.items = [
                { id: generateUUID(), name: '월세', amount: null, note: '', active: true, createdAt: new Date().toISOString() },
                { id: generateUUID(), name: '관리비', amount: null, note: '', active: true, createdAt: new Date().toISOString() },
                { id: generateUUID(), name: '전기요금', amount: null, note: '', active: true, createdAt: new Date().toISOString() },
                { id: generateUUID(), name: '통신비', amount: null, note: '', active: true, createdAt: new Date().toISOString() }
            ];
            saveToStorage();
        }

        if (paymentsJson) {
            state.payments = JSON.parse(paymentsJson);
            // 마이그레이션: 기존 레코드에 monthsPaid 기본값 설정
            state.payments.forEach(payment => {
                if (payment.monthsPaid === undefined) {
                    payment.monthsPaid = 1;
                }
            });
            saveToStorage(); // 마이그레이션 후 저장
        } else {
            state.payments = [];
        }

        if (uiJson) {
            const ui = JSON.parse(uiJson);
            state.currentYear = ui.currentYear || new Date().getFullYear();
            state.filter = ui.filter || 'all';
            state.sort = ui.sort || 'name';
            state.search = ui.search || '';
        } else {
            state.currentYear = new Date().getFullYear();
        }
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * localStorage에 데이터 저장
 */
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(state.items));
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(state.payments));
        localStorage.setItem(STORAGE_KEYS.UI, JSON.stringify({
            currentYear: state.currentYear,
            filter: state.filter,
            sort: state.sort,
            search: state.search
        }));
    } catch (error) {
        console.error('데이터 저장 실패:', error);
        alert('데이터를 저장하는 중 오류가 발생했습니다.');
    }
}

// ==================== DOM 헬퍼 ====================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

// ==================== 검증 함수 ====================

/**
 * 항목명 중복 체크
 */
function isDuplicateName(name, excludeId = null) {
    const normalized = normalizeString(name);
    return state.items.some(item => 
        item.active && 
        item.id !== excludeId && 
        normalizeString(item.name) === normalized
    );
}

/**
 * 지출일 유효성 검사 (해당 월 범위 내)
 */
function validatePaymentDate(dateISO, yearMonth) {
    if (!dateISO) return { valid: false, message: '지출일을 선택해주세요.' };
    if (!isDateInMonth(dateISO, yearMonth)) {
        const range = getMonthRange(yearMonth);
        return { 
            valid: false, 
            message: `지출일은 ${range.first}부터 ${range.last} 사이여야 합니다.` 
        };
    }
    return { valid: true };
}

// ==================== 렌더링 함수 ====================

/**
 * 요약 배너 업데이트
 */
function renderSummary() {
    const activeItems = state.items.filter(item => item.active);
    const yearPayments = state.payments.filter(p => {
        const year = parseInt(p.yearMonth.split('-')[0]);
        return year === state.currentYear && activeItems.some(item => item.id === p.itemId);
    });
    const paidCount = yearPayments.filter(p => p.isPaid).length;
    const totalCount = activeItems.length;
    const percentage = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

    const summaryText = `완료 ${paidCount} / 총 ${totalCount} (${percentage}%)`;
    $('#summary-text').textContent = summaryText;

    // 진행률 바 업데이트
    const progressBar = $('#progress-bar');
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }

    // 완료 항목의 합계 금액 계산
    const paidItems = yearPayments
        .filter(p => p.isPaid)
        .map(p => {
            const item = state.items.find(i => i.id === p.itemId);
            return item?.amount || 0;
        })
        .filter(amount => amount > 0);

    if (paidItems.length > 0) {
        const totalAmount = paidItems.reduce((sum, amt) => sum + amt, 0);
        $('#summary-amount').textContent = `합계: ${formatAmount(totalAmount)}원`;
    } else {
        $('#summary-amount').textContent = '';
    }
}

/**
 * 년도 선택기 렌더링
 */
function renderYearSelector() {
    const selector = $('#year-selector');
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
        years.push(i);
    }
    selector.innerHTML = years.map(year => 
        `<option value="${year}" ${year === state.currentYear ? 'selected' : ''}>${year}년</option>`
    ).join('');
}

/**
 * 월 헤더 렌더링
 */
function renderMonthHeaders() {
    const headerRow = $('#table-header-row');
    if (!headerRow) return;

    // 기존 월 헤더 제거
    headerRow.querySelectorAll('.month-header').forEach(th => th.remove());

    for (let month = 1; month <= 12; month++) {
        const th = document.createElement('th');
        th.className = 'month-header';
        th.dataset.month = String(month).padStart(2, '0');
        th.textContent = `${month}월`;
        headerRow.appendChild(th);
    }
}

/**
 * 항목 목록 렌더링 (테이블 형태)
 */
function renderItems() {
    const tbody = $('#items-tbody');
    const emptyState = $('#empty-state');

    // 필터링 및 정렬
    let filteredItems = state.items.filter(item => {
        if (!item.active && state.filter !== 'all') return false;
        
        // 검색 필터
        if (state.search) {
            const searchLower = state.search.toLowerCase();
            if (!item.name.toLowerCase().includes(searchLower)) return false;
        }

        // 상태 필터
        if (state.filter === 'all') return true;
        
        const yearPayments = state.payments.filter(p => {
            const year = parseInt(p.yearMonth.split('-')[0]);
            return year === state.currentYear && p.itemId === item.id;
        });
        const hasPaid = yearPayments.some(p => p.isPaid);

        if (state.filter === 'paid') {
            return hasPaid;
        } else if (state.filter === 'unpaid') {
            return !hasPaid;
        }

        return true;
    });

    // 정렬
    filteredItems.sort((a, b) => {
        if (state.sort === 'name') {
            return a.name.localeCompare(b.name, 'ko');
        } else if (state.sort === 'amount') {
            const amountA = a.amount || 0;
            const amountB = b.amount || 0;
            return amountB - amountA;
        } else if (state.sort === 'status') {
            const paymentsA = state.payments.filter(p => {
                const year = parseInt(p.yearMonth.split('-')[0]);
                return year === state.currentYear && p.itemId === a.id;
            });
            const paymentsB = state.payments.filter(p => {
                const year = parseInt(p.yearMonth.split('-')[0]);
                return year === state.currentYear && p.itemId === b.id;
            });
            const paidA = paymentsA.some(p => p.isPaid) ? 1 : 0;
            const paidB = paymentsB.some(p => p.isPaid) ? 1 : 0;
            return paidA - paidB;
        }
        return 0;
    });

    // 렌더링
    if (filteredItems.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = filteredItems.map(item => renderTableRow(item)).join('');
    
    // 합계 행 추가
    tbody.innerHTML += renderSummaryRow(filteredItems);

    // 이벤트 리스너 연결
    attachTableEventListeners();
}

/**
 * 테이블 행 렌더링
 */
function renderTableRow(item) {
    const months = [];
    for (let i = 1; i <= 12; i++) {
        const yearMonth = `${state.currentYear}-${String(i).padStart(2, '0')}`;
        const payment = state.payments.find(p => 
            p.itemId === item.id && p.yearMonth === yearMonth
        );
        const isPaid = payment?.isPaid || false;
        const paidDate = payment?.paidDate ? formatDate(payment.paidDate) : '';
        const method = payment?.method || '';
        const memo = payment?.memo || '';
        
        // 지출일에서 일자만 추출 (예: "2025-03-04" -> "4")
        let dayText = '';
        if (paidDate) {
            const day = parseInt(paidDate.split('-')[2]);
            dayText = `${day}`;
        }
        
        // 셀 내용 표시
        let cellContent = '';
        let prepaidBadge = '';
        
        if (isPaid) {
            if (dayText) cellContent = `${dayText}일`;
            if (memo) cellContent += (cellContent ? `(${memo})` : memo);
            if (method) {
                cellContent += (cellContent ? ` ${method}` : method);
            }
            
            // 선결제 배지 표시
            if (payment?.prepaidFromYearMonth) {
                const [preYear, preMonth] = payment.prepaidFromYearMonth.split('-');
                prepaidBadge = `<div style="font-size: 0.7rem; color: #dc2626; font-weight: 600; margin-top: 2px;">${preYear}년 ${parseInt(preMonth)}월에 선결제됨</div>`;
            } else if (payment?.monthsPaid && payment.monthsPaid > 1) {
                prepaidBadge = `<div style="font-size: 0.7rem; color: #2563eb; font-weight: 600; margin-top: 2px;">${payment.monthsPaid}개월 선결제</div>`;
            }
        }
        
        months.push(`
            <td class="month-cell ${isPaid ? 'paid' : ''}" 
                data-item-id="${item.id}" 
                data-year-month="${yearMonth}"
                title="${cellContent || '클릭하여 입력'}">
                <div style="font-size: 0.75rem; margin-bottom: 2px;">${cellContent || ''}</div>
                ${prepaidBadge}
                <input type="checkbox" class="month-cell-checkbox" ${isPaid ? 'checked' : ''}>
            </td>
        `);
    }
    
    const rowClass = item.active ? '' : 'inactive';
    
    return `
        <tr class="${rowClass}" data-item-id="${item.id}">
            <td class="col-item-name">
                <div>${escapeHtml(item.name)}</div>
                <div class="item-actions-cell">
                    <button class="btn btn-secondary btn-small edit-btn" data-item-id="${item.id}">수정</button>
                    ${item.active 
                        ? `<button class="btn btn-secondary btn-small deactivate-btn" data-item-id="${item.id}">비활성화</button>`
                        : `<button class="btn btn-secondary btn-small activate-btn" data-item-id="${item.id}">활성화</button>`
                    }
                    <button class="btn btn-danger btn-small delete-btn" data-item-id="${item.id}">삭제</button>
                </div>
            </td>
            <td class="col-amount">${item.amount ? formatAmount(item.amount) : ''}</td>
            <td class="col-note">${escapeHtml(item.note || '')}</td>
            ${months.join('')}
        </tr>
    `;
}

/**
 * 합계 행 렌더링 (지급월 기준)
 */
function renderSummaryRow(items) {
    const monthTotals = [];
    
    for (let i = 1; i <= 12; i++) {
        const yearMonth = `${state.currentYear}-${String(i).padStart(2, '0')}`;
        let total = 0;
        
        // 지급월 기준으로 합계 계산
        // 해당 월(지급월)에 실제로 지급된 모든 PaymentRecord 찾기
        // paidDate가 없으면 yearMonth를 지급월로 간주
        const paidInThisMonth = state.payments.filter(p => {
            if (!p.isPaid) return false;
            
            let paymentMonth;
            if (p.paidDate) {
                paymentMonth = ymOf(p.paidDate);
            } else {
                // paidDate가 없으면 yearMonth를 지급월로 간주
                paymentMonth = p.yearMonth;
            }
            
            return paymentMonth === yearMonth;
        });
        
        // 각 레코드에 대해 금액 합산
        paidInThisMonth.forEach(payment => {
            const item = items.find(i => i.id === payment.itemId);
            if (!item || !item.active || !item.amount) return;
            
            // 원 결제 월(선결제 트리거)이면 monthsPaid만큼 곱
            if (payment.monthsPaid && payment.monthsPaid > 1 && !payment.prepaidFromYearMonth) {
                total += item.amount * payment.monthsPaid;
            } else if (!payment.prepaidFromYearMonth) {
                // 후속 월은 제외 (prepaidFromYearMonth가 있으면 합산 안 함)
                total += item.amount;
            }
        });
        
        monthTotals.push(`
            <td class="month-cell summary-cell">
                <div style="font-weight: 600; font-size: 0.875rem; text-align: right;">${total > 0 ? formatAmount(total) : ''}</div>
            </td>
        `);
    }
    
    return `
        <tr class="summary-row">
            <td class="col-item-name" style="font-weight: 600; background-color: #f1f5f9;">합계</td>
            <td class="col-amount" style="font-weight: 600; background-color: #f1f5f9;"></td>
            <td class="col-note" style="background-color: #f1f5f9;"></td>
            ${monthTotals.join('')}
        </tr>
    `;
}

/**
 * 개별 항목 카드 렌더링 (레거시 - 사용 안 함)
 */
function renderItemCard(item) {
    const payment = state.payments.find(p => 
        p.itemId === item.id && p.yearMonth === state.currentMonth
    );

    const paidDate = payment?.paidDate ? formatDate(payment.paidDate) : '';
    const method = payment?.method || '';
    const memo = payment?.memo || '';
    const isPaid = payment?.isPaid || false;

    const cardClass = [
        'item-card',
        isPaid ? 'paid' : '',
        !item.active ? 'inactive' : ''
    ].filter(Boolean).join(' ');

    return `
        <div class="${cardClass}" data-item-id="${item.id}" role="listitem">
            <div class="item-header">
                <div class="item-info">
                    <div class="item-name">${escapeHtml(item.name)}</div>
                    ${item.amount ? `<div class="item-amount">${formatAmount(item.amount)}원</div>` : ''}
                    ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-secondary btn-small edit-btn" data-item-id="${item.id}" aria-label="수정">수정</button>
                    ${item.active 
                        ? `<button class="btn btn-secondary btn-small deactivate-btn" data-item-id="${item.id}" aria-label="비활성화">비활성화</button>`
                        : `<button class="btn btn-secondary btn-small activate-btn" data-item-id="${item.id}" aria-label="활성화">활성화</button>`
                    }
                    <button class="btn btn-danger btn-small delete-btn" data-item-id="${item.id}" aria-label="삭제">삭제</button>
                </div>
            </div>
            <div class="item-payment">
                <div class="payment-row">
                    <label for="paid-date-${item.id}">지출일</label>
                    <input type="date" 
                           id="paid-date-${item.id}" 
                           class="paid-date-input" 
                           data-item-id="${item.id}"
                           value="${paidDate}"
                           aria-label="지출일 선택">
                </div>
                <div class="payment-row">
                    <label for="payment-method-${item.id}">지불 방법</label>
                    <select id="payment-method-${item.id}" 
                            class="payment-method-select" 
                            data-item-id="${item.id}"
                            aria-label="지불 방법 선택">
                        <option value="">선택</option>
                        <option value="신용카드" ${method === '신용카드' ? 'selected' : ''}>신용카드</option>
                        <option value="계좌이체" ${method === '계좌이체' ? 'selected' : ''}>계좌이체</option>
                        <option value="현금" ${method === '현금' ? 'selected' : ''}>현금</option>
                        <option value="자동이체" ${method === '자동이체' ? 'selected' : ''}>자동이체</option>
                        <option value="기타" ${method === '기타' ? 'selected' : ''}>기타</option>
                    </select>
                </div>
                <div class="payment-row">
                    <label for="payment-memo-${item.id}">메모</label>
                    <textarea id="payment-memo-${item.id}" 
                              class="payment-memo-input" 
                              data-item-id="${item.id}"
                              placeholder="선택사항"
                              aria-label="메모 입력">${escapeHtml(memo)}</textarea>
                </div>
                <div class="payment-status">
                    <input type="checkbox" 
                           id="payment-status-${item.id}" 
                           class="payment-status-checkbox" 
                           data-item-id="${item.id}"
                           ${isPaid ? 'checked' : ''}
                           aria-label="지출 완료">
                    <label for="payment-status-${item.id}">지출 완료</label>
                </div>
            </div>
        </div>
    `;
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 테이블에 이벤트 리스너 연결
 */
function attachTableEventListeners() {
    // 수정 버튼
    $$('.edit-btn').forEach(btn => {
        btn.addEventListener('click', handleEditItem);
    });

    // 비활성화/활성화 버튼
    $$('.deactivate-btn, .activate-btn').forEach(btn => {
        btn.addEventListener('click', handleToggleActive);
    });

    // 삭제 버튼
    $$('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteItem);
    });

    // 월 셀 클릭 (캘린더 뷰 열기)
    $$('.month-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
            // 체크박스 클릭은 별도 처리
            if (e.target.type === 'checkbox') {
                e.stopPropagation();
                handleMonthCellCheckbox(e);
                return;
            }
            const itemId = cell.dataset.itemId;
            const yearMonth = cell.dataset.yearMonth;
            openCalendarModal(itemId, yearMonth);
        });
    });

    // 월 셀 체크박스
    $$('.month-cell-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', handleMonthCellCheckbox);
    });
}

// ==================== 액션 핸들러 ====================

/**
 * 항목 추가
 */
function handleAddItem(e) {
    e.preventDefault();
    
    const nameInput = $('#item-name');
    const amountInput = $('#item-amount');
    const noteInput = $('#item-note');

    const name = nameInput.value.trim();
    const amount = amountInput.value ? parseInt(amountInput.value, 10) : null;
    const note = noteInput.value.trim();

    // 검증
    if (!name) {
        alert('항목명을 입력해주세요.');
        nameInput.focus();
        return;
    }

    if (isDuplicateName(name)) {
        alert('같은 이름의 항목이 이미 존재합니다.');
        nameInput.focus();
        return;
    }

    // 항목 추가
    const newItem = {
        id: generateUUID(),
        name,
        amount,
        note,
        active: true,
        createdAt: new Date().toISOString()
    };

    state.items.push(newItem);
    saveToStorage();
    renderItems();
    renderSummary();

    // 폼 리셋
    nameInput.value = '';
    amountInput.value = '';
    noteInput.value = '';
    nameInput.focus();
}

/**
 * 항목 수정
 */
function handleEditItem(e) {
    const itemId = e.target.dataset.itemId;
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    // 모달에 값 설정
    $('#edit-item-id').value = item.id;
    $('#edit-item-name').value = item.name;
    $('#edit-item-amount').value = item.amount || '';
    $('#edit-item-note').value = item.note || '';

    // 모달 표시
    const modal = $('#edit-modal');
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
}

/**
 * 항목 수정 저장
 */
function handleSaveEdit(e) {
    e.preventDefault();

    const itemId = $('#edit-item-id').value;
    const name = $('#edit-item-name').value.trim();
    const amount = $('#edit-item-amount').value ? parseInt($('#edit-item-amount').value, 10) : null;
    const note = $('#edit-item-note').value.trim();

    if (!name) {
        alert('항목명을 입력해주세요.');
        return;
    }

    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    if (isDuplicateName(name, itemId)) {
        alert('같은 이름의 항목이 이미 존재합니다.');
        return;
    }

    item.name = name;
    item.amount = amount;
    item.note = note;

    saveToStorage();
    renderItems();
    renderSummary();
    closeEditModal();
}

/**
 * 수정 모달 닫기
 */
function closeEditModal() {
    const modal = $('#edit-modal');
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
}

/**
 * 항목 활성화/비활성화 토글
 */
function handleToggleActive(e) {
    const itemId = e.target.dataset.itemId;
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    item.active = !item.active;
    saveToStorage();
    renderItems();
    renderSummary();
}

/**
 * 항목 삭제
 */
function handleDeleteItem(e) {
    const itemId = e.target.dataset.itemId;
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    showConfirmModal(
        `"${item.name}" 항목을 삭제하시겠습니까?`,
        () => {
            // 비활성화로 처리 (PaymentRecord는 보존)
            item.active = false;
            saveToStorage();
            renderItems();
            renderSummary();
        }
    );
}

/**
 * 지출일 변경
 */
function handlePaymentDateChange(e) {
    const itemId = e.target.dataset.itemId;
    const dateISO = e.target.value;

    if (!dateISO) {
        updatePaymentRecord(itemId, { paidDate: null });
        return;
    }

    const validation = validatePaymentDate(dateISO, state.currentMonth);
    if (!validation.valid) {
        alert(validation.message);
        e.target.value = '';
        updatePaymentRecord(itemId, { paidDate: null });
        return;
    }

    updatePaymentRecord(itemId, { paidDate: dateISO });
}

/**
 * 지불 방법 변경
 */
function handlePaymentMethodChange(e) {
    const itemId = e.target.dataset.itemId;
    const method = e.target.value || '기타';
    updatePaymentRecord(itemId, { method });
}

/**
 * 메모 변경
 */
function handlePaymentMemoChange(e) {
    const itemId = e.target.dataset.itemId;
    const memo = e.target.value.trim();
    updatePaymentRecord(itemId, { memo });
}

/**
 * 지출 완료 상태 변경
 */
function handlePaymentStatusChange(e) {
    const itemId = e.target.dataset.itemId;
    const isPaid = e.target.checked;

    if (isPaid) {
        // 지출 완료 체크 시 유효성 검사
        const dateInput = $(`#paid-date-${itemId}`);
        const dateISO = dateInput.value;

        if (!dateISO) {
            alert('지출일을 먼저 선택해주세요.');
            e.target.checked = false;
            return;
        }

        const validation = validatePaymentDate(dateISO, state.currentMonth);
        if (!validation.valid) {
            alert(validation.message);
            e.target.checked = false;
            return;
        }

        // 지불 방법이 없으면 기본값 설정
        const methodSelect = $(`#payment-method-${itemId}`);
        if (!methodSelect.value) {
            methodSelect.value = '기타';
        }

        updatePaymentRecord(itemId, {
            isPaid: true,
            paidDate: dateISO,
            method: methodSelect.value || '기타'
        });
    } else {
        updatePaymentRecord(itemId, { isPaid: false });
    }
}

/**
 * PaymentRecord 업데이트 또는 생성
 */
function updatePaymentRecord(itemId, yearMonth, updates) {
    let payment = state.payments.find(p => 
        p.itemId === itemId && p.yearMonth === yearMonth
    );

    if (!payment) {
        payment = {
            itemId,
            yearMonth,
            paidDate: null,
            method: null,
            memo: '',
            isPaid: false,
            monthsPaid: 1
        };
        state.payments.push(payment);
    }

    Object.assign(payment, updates);
    saveToStorage();
}

/**
 * 선결제 그룹 적용
 */
function applyPrepaymentGroup(startYM, monthsPaid, itemId, paidDate, method, memo, groupId) {
    if (!groupId) {
        groupId = generateUUID();
    }
    
    const records = [];
    
    for (let k = 0; k < monthsPaid; k++) {
        const targetYM = addMonths(startYM, k);
        let payment = state.payments.find(p => 
            p.itemId === itemId && p.yearMonth === targetYM
        );
        
        if (!payment) {
            payment = {
                itemId,
                yearMonth: targetYM,
                paidDate: null,
                method: null,
                memo: '',
                isPaid: false,
                monthsPaid: 1
            };
            state.payments.push(payment);
        }
        
        payment.isPaid = true;
        payment.paidDate = paidDate;
        payment.method = method;
        payment.memo = memo;
        payment.paymentGroupId = groupId;
        
        if (k === 0) {
            // 원 결제 월
            payment.monthsPaid = monthsPaid;
            payment.prepaidFromYearMonth = undefined;
        } else {
            // 후속 월
            payment.monthsPaid = 1;
            payment.prepaidFromYearMonth = startYM;
        }
        
        records.push(payment);
    }
    
    saveToStorage();
    return records;
}

/**
 * 선결제 그룹 제거
 */
function removePrepaymentGroup(groupId) {
    const toRemove = state.payments.filter(p => p.paymentGroupId === groupId);
    
    toRemove.forEach(payment => {
        payment.isPaid = false;
        payment.paidDate = null;
        payment.method = null;
        payment.memo = '';
        payment.monthsPaid = 1;
        payment.paymentGroupId = undefined;
        payment.prepaidFromYearMonth = undefined;
    });
    
    saveToStorage();
    return toRemove;
}

/**
 * 선결제 그룹 찾기
 */
function findPrepaymentGroup(itemId, yearMonth) {
    const payment = state.payments.find(p => 
        p.itemId === itemId && p.yearMonth === yearMonth
    );
    
    if (!payment || !payment.paymentGroupId) {
        return null;
    }
    
    return state.payments.filter(p => p.paymentGroupId === payment.paymentGroupId);
}

/**
 * 년도 변경
 */
function handleYearChange(e) {
    state.currentYear = parseInt(e.target.value);
    saveToStorage();
    renderItems();
    renderSummary();
}

/**
 * 월 셀 체크박스 클릭
 */
function handleMonthCellCheckbox(e) {
    e.stopPropagation();
    const cell = e.target.closest('.month-cell');
    const itemId = cell.dataset.itemId;
    const yearMonth = cell.dataset.yearMonth;
    const isChecked = e.target.checked;
    
    if (isChecked) {
        // 체크 시 paidDate 없이 합계에만 반영 (paidDate는 나중에 설정 가능)
        updatePaymentRecord(itemId, yearMonth, {
            isPaid: true,
            paidDate: null,
            method: '신용카드',
            monthsPaid: 1,
            paymentGroupId: generateUUID()
        });
    } else {
        // 체크 해제 시 기존 그룹이 있으면 제거
        const existingPayment = state.payments.find(p => 
            p.itemId === itemId && p.yearMonth === yearMonth
        );
        if (existingPayment?.paymentGroupId) {
            removePrepaymentGroup(existingPayment.paymentGroupId);
        } else {
            updatePaymentRecord(itemId, yearMonth, {
                isPaid: false,
                paidDate: null,
                method: null,
                memo: '',
                monthsPaid: 1,
                paymentGroupId: undefined,
                prepaidFromYearMonth: undefined
            });
        }
    }
    
    renderItems();
    renderSummary();
}

/**
 * 캘린더 모달 열기
 */
function openCalendarModal(itemId, yearMonth) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    
    const payment = state.payments.find(p => 
        p.itemId === itemId && p.yearMonth === yearMonth
    );
    
    // 모달 정보 설정
    $('#calendar-item-name').textContent = item.name;
    const [year, month] = yearMonth.split('-');
    $('#calendar-month-year').textContent = `${year}년 ${parseInt(month)}월`;
    
    // 폼 값 설정
    $('#detail-item-id').value = itemId;
    $('#detail-year-month').value = yearMonth;
    $('#detail-paid-date').value = payment?.paidDate ? formatDate(payment.paidDate) : '';
    $('#detail-months-paid').value = payment?.monthsPaid || 1;
    $('#detail-method').value = payment?.method || '신용카드';
    $('#detail-memo').value = payment?.memo || '';
    $('#detail-is-paid').checked = payment?.isPaid || false;
    
    // 캘린더 렌더링
    renderCalendar(yearMonth, payment?.paidDate);
    
    // 모달 표시
    const modal = $('#calendar-modal');
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
}

/**
 * 캘린더 렌더링
 */
function renderCalendar(yearMonth, selectedDate = null) {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const calendarView = $('#calendar-view');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    
    let html = dayNames.map(day => 
        `<div class="calendar-day-header">${day}</div>`
    ).join('');
    
    // 빈 칸 (월 시작 전)
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day other-month"></div>';
    }
    
    // 날짜 칸
    const today = new Date();
    const isTodayMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = selectedDate === dateStr;
        const isToday = isTodayMonth && day === today.getDate();
        
        let classes = ['calendar-day'];
        if (isSelected) classes.push('selected');
        if (isToday) classes.push('today');
        
        html += `<div class="${classes.join(' ')}" data-date="${dateStr}">${day}</div>`;
    }
    
    // 빈 칸 (월 종료 후)
    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
        for (let i = 0; i < remainingCells; i++) {
            html += '<div class="calendar-day other-month"></div>';
        }
    }
    
    calendarView.innerHTML = html;
    
    // 날짜 클릭 이벤트
    $$('.calendar-day:not(.other-month)').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            const date = dayEl.dataset.date;
            $('#detail-paid-date').value = date;
            
            // 선택 표시 업데이트
            $$('.calendar-day').forEach(d => d.classList.remove('selected'));
            dayEl.classList.add('selected');
        });
    });
}

/**
 * 캘린더 모달 닫기
 */
function closeCalendarModal() {
    const modal = $('#calendar-modal');
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
}

/**
 * 지출 상세 정보 저장
 */
function handleSavePaymentDetail(e) {
    e.preventDefault();
    
    const itemId = $('#detail-item-id').value;
    const yearMonth = $('#detail-year-month').value;
    const paidDate = $('#detail-paid-date').value;
    const monthsPaid = parseInt($('#detail-months-paid').value) || 1;
    const method = $('#detail-method').value || '신용카드';
    const memo = $('#detail-memo').value.trim();
    const isPaid = $('#detail-is-paid').checked;
    
    if (monthsPaid < 1) {
        alert('결제 개월 수는 1 이상이어야 합니다.');
        return;
    }
    
    if (!isPaid) {
        // 미지급으로 변경 시 기존 그룹 제거
        const existingPayment = state.payments.find(p => 
            p.itemId === itemId && p.yearMonth === yearMonth
        );
        if (existingPayment?.paymentGroupId) {
            removePrepaymentGroup(existingPayment.paymentGroupId);
        } else {
            updatePaymentRecord(itemId, yearMonth, {
                isPaid: false,
                paidDate: null,
                method: null,
                memo: '',
                monthsPaid: 1,
                paymentGroupId: undefined,
                prepaidFromYearMonth: undefined
            });
        }
    } else {
        // 지급 완료 처리
        // paidDate가 없으면 해당 yearMonth의 첫날을 기본값으로 설정
        let finalPaidDate = paidDate;
        if (!finalPaidDate) {
            const [year, month] = yearMonth.split('-').map(Number);
            finalPaidDate = `${year}-${String(month).padStart(2, '0')}-01`;
        }
        
        // 기존 그룹이 있으면 제거
        const existingPayment = state.payments.find(p => 
            p.itemId === itemId && p.yearMonth === yearMonth
        );
        if (existingPayment?.paymentGroupId) {
            removePrepaymentGroup(existingPayment.paymentGroupId);
        }
        
        if (monthsPaid === 1) {
            // 단월 결제
            updatePaymentRecord(itemId, yearMonth, {
                isPaid: true,
                paidDate: finalPaidDate,
                method: method,
                memo: memo,
                monthsPaid: 1,
                paymentGroupId: generateUUID(),
                prepaidFromYearMonth: undefined
            });
        } else {
            // 선결제
            applyPrepaymentGroup(yearMonth, monthsPaid, itemId, finalPaidDate, method, memo);
        }
    }
    
    renderItems();
    renderSummary();
    
    // 지출 완료 시 애니메이션 효과
    if (isPaid) {
        const row = $(`tr[data-item-id="${itemId}"]`);
        if (row) {
            row.classList.add('paid');
            setTimeout(() => {
                row.classList.remove('paid');
            }, 700);
        }
    }
    
    closeCalendarModal();
}

/**
 * 지출 기록 삭제
 */
function handleDeletePayment() {
    const itemId = $('#detail-item-id').value;
    const yearMonth = $('#detail-year-month').value;
    
    const existingPayment = state.payments.find(p => 
        p.itemId === itemId && p.yearMonth === yearMonth
    );
    
    if (existingPayment?.paymentGroupId) {
        // 선결제 그룹이면 전체 그룹 삭제
        showConfirmModal(
            '선결제 그룹 전체를 삭제하시겠습니까?',
            () => {
                removePrepaymentGroup(existingPayment.paymentGroupId);
                renderItems();
                renderSummary();
                closeCalendarModal();
            }
        );
    } else {
        // 단일 결제면 해당 레코드만 삭제
        showConfirmModal(
            '이 월의 지출 기록을 삭제하시겠습니까?',
            () => {
                const index = state.payments.findIndex(p => 
                    p.itemId === itemId && p.yearMonth === yearMonth
                );
                if (index !== -1) {
                    state.payments.splice(index, 1);
                    saveToStorage();
                    renderItems();
                    renderSummary();
                    closeCalendarModal();
                }
            }
        );
    }
}

/**
 * 필터 변경
 */
function handleFilterChange(e) {
    state.filter = e.target.value;
    saveToStorage();
    renderItems();
}

/**
 * 정렬 변경
 */
function handleSortChange(e) {
    state.sort = e.target.value;
    saveToStorage();
    renderItems();
}

/**
 * 검색 변경
 */
function handleSearchChange(e) {
    state.search = e.target.value;
    saveToStorage();
    renderItems();
}

/**
 * 데이터 내보내기
 */
function handleExport() {
    const data = {
        items: state.items,
        payments: state.payments,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed-expenses-${getCurrentYearMonth()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 데이터 가져오기
 */
function handleImport() {
    const input = $('#import-file');
    input.click();
}

/**
 * 파일 선택 처리
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            
            if (!data.items || !Array.isArray(data.items) || 
                !data.payments || !Array.isArray(data.payments)) {
                throw new Error('잘못된 데이터 형식입니다.');
            }

            showConfirmModal(
                '기존 데이터를 덮어쓰시겠습니까? (취소하면 병합됩니다)',
                () => {
                    // 덮어쓰기
                    state.items = data.items;
                    state.payments = data.payments;
                    saveToStorage();
                    renderItems();
                    renderSummary();
                    alert('데이터를 가져왔습니다.');
                },
                () => {
                    // 병합
                    const existingIds = new Set(state.items.map(i => i.id));
                    data.items.forEach(item => {
                        if (!existingIds.has(item.id)) {
                            state.items.push(item);
                        }
                    });

                    const existingPaymentKeys = new Set(
                        state.payments.map(p => `${p.itemId}-${p.yearMonth}`)
                    );
                    data.payments.forEach(payment => {
                        const key = `${payment.itemId}-${payment.yearMonth}`;
                        if (!existingPaymentKeys.has(key)) {
                            state.payments.push(payment);
                        }
                    });

                    saveToStorage();
                    renderItems();
                    renderSummary();
                    alert('데이터를 병합했습니다.');
                }
            );
        } catch (error) {
            alert('파일을 읽는 중 오류가 발생했습니다: ' + error.message);
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // 같은 파일 다시 선택 가능하도록
}

/**
 * 데이터 초기화
 */
function handleReset() {
    showConfirmModal(
        '모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
        () => {
            localStorage.removeItem(STORAGE_KEYS.ITEMS);
            localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
            localStorage.removeItem(STORAGE_KEYS.UI);
            location.reload();
        }
    );
}

/**
 * 확인 모달 표시
 */
function showConfirmModal(message, onConfirm, onCancel = null) {
    $('#confirm-message').textContent = message;
    const modal = $('#confirm-modal');
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');

    const yesBtn = $('#confirm-yes-btn');
    const noBtn = $('#confirm-no-btn');

    const closeModal = () => {
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('open');
        yesBtn.onclick = null;
        noBtn.onclick = null;
    };

    yesBtn.onclick = () => {
        if (onConfirm) onConfirm();
        closeModal();
    };

    noBtn.onclick = () => {
        if (onCancel) onCancel();
        closeModal();
    };
}

// ==================== 초기화 ====================

/**
 * 앱 초기화
 */
function init() {
    // 데이터 로드
    loadFromStorage();

    // 년도 선택기 및 월 헤더 렌더링
    renderYearSelector();
    renderMonthHeaders();

    // 이벤트 리스너 연결
    $('#add-item-form').addEventListener('submit', handleAddItem);
    $('#year-selector').addEventListener('change', handleYearChange);
    $('#filter-select').value = state.filter;
    $('#filter-select').addEventListener('change', handleFilterChange);
    $('#sort-select').value = state.sort;
    $('#sort-select').addEventListener('change', handleSortChange);
    $('#search-input').value = state.search;
    $('#search-input').addEventListener('input', handleSearchChange);

    $('#export-btn').addEventListener('click', handleExport);
    $('#import-btn').addEventListener('click', handleImport);
    $('#import-file').addEventListener('change', handleFileSelect);
    $('#reset-btn').addEventListener('click', handleReset);

    $('#edit-item-form').addEventListener('submit', handleSaveEdit);
    $('#cancel-edit-btn').addEventListener('click', closeEditModal);

    $('#payment-detail-form').addEventListener('submit', handleSavePaymentDetail);
    $('#cancel-calendar-btn').addEventListener('click', closeCalendarModal);
    $('#delete-payment-btn').addEventListener('click', handleDeletePayment);

    // 모달 외부 클릭 시 닫기
    $('#edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') closeEditModal();
    });
    $('#confirm-modal').addEventListener('click', (e) => {
        if (e.target.id === 'confirm-modal') {
            $('#confirm-modal').setAttribute('aria-hidden', 'true');
            $('#confirm-modal').classList.remove('open');
        }
    });
    $('#calendar-modal').addEventListener('click', (e) => {
        if (e.target.id === 'calendar-modal') closeCalendarModal();
    });

    // 초기 렌더링
    renderItems();
    renderSummary();
}

// DOMContentLoaded 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}

