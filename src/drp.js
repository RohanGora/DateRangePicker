import styles from './drp.css';

export function initializeDateRangePicker(containerId, isRangeSelector = true) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found.`);
        return;
    }

    // Inject CSS automatically
    const styleTag = document.createElement('style');
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);

    // Main HTML structure
    container.innerHTML = `
        <div class="drp-wrapper">
            <button class="drp-open-button">
                <input
                    class="drp-selected-range-input"
                    id="drp-selectedRange"
                    type="text"
                    value=""
                    placeholder="Select date(s)"
                    readonly
                />
            </button>
            <div class="drp-overlay" id="drp-overlay"></div>
            <div class="drp-popup" id="drp-popup">
                <div class="drp-navigation">
                    <button class="drp-prev-nav">&lt;</button>
                    <button class="drp-next-nav">&gt;</button>
                </div>
                <div class="drp-close-button">&cross;</div>
                <div class="drp-calendar-container" id="drp-calendarContainer"></div>
                <div class="drp-mobile-footer">
                    <div id="drp-selectedMobileRange"></div>
                    <button class="drp-apply-button">Select</button>
                </div>
            </div>
        </div>
    `;

    // Constants and state
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
        "January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"
    ];

    const state = {
        today: new Date(),
        todayFuture: null,
        selectedDates: { start: null, end: null },
        backupEndDate: null,
        currentMonthIndex: 0,
        calculateCurrentMonthIndex: true,
        isRangeSelector
    };

    // Initialize dates
    state.today.setHours(0, 0, 0, 0);
    state.todayFuture = new Date(
        state.today.getFullYear() + 1,
        state.today.getMonth(),
        state.today.getDate() - 1
    );

    // DOM elements
    const elements = {
        openButton: container.querySelector('.drp-open-button'),
        overlay: container.querySelector('.drp-overlay'),
        popup: container.querySelector('.drp-popup'),
        prevNav: container.querySelector('.drp-prev-nav'),
        nextNav: container.querySelector('.drp-next-nav'),
        closeButton: container.querySelector('.drp-close-button'),
        applyButton: container.querySelector('.drp-apply-button'),
        calendarContainer: container.querySelector('.drp-calendar-container'),
        selectedInput: container.querySelector('#drp-selectedRange'),
        mobileRangeDisplay: container.querySelector('#drp-selectedMobileRange')
    };

    // Event listeners
    elements.openButton.addEventListener('click', openRangePicker);
    elements.overlay.addEventListener('click', () => closeRangePicker(true));
    elements.closeButton.addEventListener('click', () => closeRangePicker(false));
    elements.applyButton.addEventListener('click', () => closeRangePicker(false));
    elements.prevNav.addEventListener('click', previousMonths);
    elements.nextNav.addEventListener('click', nextMonths);
    window.addEventListener('resize', handleResize);

    // Calendar generation
    function generateCalendar(year, month, parent) {
        const calendar = document.createElement('div');
        calendar.className = 'drp-calendar';

        const header = document.createElement('h3');
        header.textContent = `${months[month]} ${year}`;
        calendar.appendChild(header);

        const daysContainer = document.createElement('div');
        daysContainer.className = 'drp-days-container';

        // Create weekday headers
        weekdays.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'drp-day-header';
            dayHeader.textContent = day;
            daysContainer.appendChild(dayHeader);
        });

        // Calculate dates
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty days
        for (let i = 0; i < firstDay; i++) {
            daysContainer.appendChild(createDayElement(''));
        }

        // Add actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayElement = createDayElement(day, date);
            daysContainer.appendChild(dayElement);
        }

        calendar.appendChild(daysContainer);
        parent.appendChild(calendar);
    }

    function createDayElement(day, date = null) {
        const element = document.createElement('div');
        element.className = 'drp-day';

        if (date) {
            element.textContent = day;
            element.dataset.date = date.toISOString();

            if (date < state.today || date > state.todayFuture) {
                element.classList.add('drp-disabled');
            } else {
                element.classList.add('drp-selectable');
                if (date.toDateString() === state.today.toDateString()) {
                    element.classList.add('drp-today');
                }
            }
        }
        return element;
    }

    // Date selection logic
    function handleDateSelection(e) {
        const dayElement = e.target.closest('.drp-selectable');
        if (!dayElement) return;

        const selectedDate = new Date(dayElement.dataset.date);

        if (state.isRangeSelector) {
            handleRangeSelection(selectedDate);
        } else {
            handleSingleSelection(selectedDate);
        }

        updateDisplay();
        highlightSelectedDates();
    }

    function handleRangeSelection(date) {
        if (!state.selectedDates.start || state.selectedDates.end) {
            state.selectedDates.start = date;
            state.selectedDates.end = null;
        } else {
            state.selectedDates.end = date;
            if (state.selectedDates.start > state.selectedDates.end) {
                [state.selectedDates.start, state.selectedDates.end] =
                    [state.selectedDates.end, state.selectedDates.start];
            }
            if (window.innerWidth > 768) closeRangePicker(false);
        }
    }

    function handleSingleSelection(date) {
        state.selectedDates.start = date;
        state.selectedDates.end = null;
        if (window.innerWidth > 768) closeRangePicker(false);
    }

    // Display updates
    function updateDisplay() {
        const rangeText = state.selectedDates.start
            ? `${formatDate(state.selectedDates.start)}${state.selectedDates.end
                ? ` - ${formatDate(state.selectedDates.end)}` : ''}`
            : 'Select dates';

        elements.selectedInput.value = rangeText;
        elements.mobileRangeDisplay.textContent = rangeText;
    }

    function formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Navigation controls
    function previousMonths() {
        state.currentMonthIndex = Math.max(0, state.currentMonthIndex - 2);
        refreshCalendar();
    }

    function nextMonths() {
        state.currentMonthIndex += 2;
        refreshCalendar();
    }

    function refreshCalendar() {
        elements.calendarContainer.innerHTML = '';
        renderCalendar();
    }

    // Calendar visibility
    function openRangePicker() {
        elements.popup.classList.add('drp-active');
        elements.overlay.classList.add('drp-active');
        renderCalendar();
    }

    function closeRangePicker(isOverlayClick) {
        if (!isOverlayClick || window.innerWidth > 768) {
            elements.popup.classList.remove('drp-active');
            elements.overlay.classList.remove('drp-active');
        }
    }

    // Responsive handling
    function handleResize() {
        refreshCalendar();
        elements.popup.classList.toggle('drp-mobile-view', window.innerWidth <= 768);
    }

    // Cleanup function
    return function destroy() {
        window.removeEventListener('resize', handleResize);
        container.innerHTML = '';
        document.head.removeChild(styleTag);
    };
}