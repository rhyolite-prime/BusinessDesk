const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            levels: [],
            academicYearId: '',
            termId: '',
            classId: '',
            bills:[],
            payments: [],
            memos: [],
            boardingItems: [],
            feeItems: [],
            supplementaryItems: [],
            students: [],
            studentBills: [],
            accountsList: [],
            defaultAccounts: {},
            searchText: '',
            studentId: null,
            paymentId: null,
            isEdit: false,
            selectedPayments: [],
            selectedMemos: [],
            selectedBills: [],
            currencies:[],
            billTypes:[],
            billScopes:[],
            classList: [],
            levelId: '',
            isMultiCurrency: false,
            billTypeId: null,
            activeTab: 'bills',
            schData: [],
            isShimmerLoading: false,
            billGlAccounts:[],
            
        }
    },
    computed: {
        allLevelClasses() {
            return this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
        },
        amountDue() {
            if (!this.studentId) return 0;

            const student = this.students.find(s => s.id === this.studentId);
            const baseBalance = parseFloat(student?.balanceDue) || 0;
            const paymentTotal = this.payments
                .filter(p => {
                    if (p.studentId !== this.studentId) return false;
                    // if editing, exclude the current record and use student actual balance
                    return !(this.isEdit && p.id === this.paymentId);

                })
                .reduce((sum, p) => sum + (parseFloat(p.amountToPaid) || 0), 0);
            return baseBalance - paymentTotal;
        },
        paymentData() {
            return this.payments.map(p => {

                const student = this.students.find(s => s.id === p.studentId);
                const currency = this.currencies.find(c => c.id === p.currencyId);
                const debitAccount = this.accountsList.find(a => a.id === p.debitGlId);
                const creditAccount = this.accountsList.find(a => a.id === p.creditGlId);

                const amountToPaid = parseFloat(p.amountToPaid) || 0;
                const buyRate = parseFloat(p.buyRate) || 1;
                const amountDue = parseFloat(p.amountDue) || 0;

                const convertedAmount = p.isMultiCurrency
                    ? amountToPaid * buyRate
                    : amountToPaid;

                const newBalance = amountDue - convertedAmount;
                const academicYear = this.academicYears.find(a => a.id === p.academicYearId);
                const term = this.terms.find(a => a.id === p.termId);
                const yearName = academicYear ? academicYear.name : '—';
                const termName = term ? term.name : '—';
                const period = `${yearName} - ${termName}`;
                return {
                    id: p.id,
                    tenantId: p.tenantId,
                    studentId: p.studentId,
                    academicYearId: p.academicYearId,
                    termId: p.termId,
                    classId: p.classId,
                    currencyId: p.currencyId,
                    paymentMethod: p.paymentMethod,

                    debitGlId: p.debitGlId,
                    creditGlId: p.creditGlId,
                    bankGlId: p.bankGlId,

                    bankId: p.bankId,
                    bankBranchId: p.bankBranchId,

                    legalGuardianId: p.legalGuardianId,
                    byLegalGuardian: p.byLegalGuardian,

                    paymentDate: p.paymentDate,
                    batchNumber: p.batchNumber || '—',
                    receiptNumber: p.receiptNumber || '—',
                    referenceNumber: p.referenceNumber,
                    description: p.description,
                    period: period,
                    amountDue,
                    amountToPaid,
                    buyRate,
                    convertedAmount,
                    newBalance: newBalance,
                    newBalanceDisplay:
                        newBalance < 0
                            ? `(${Math.abs(newBalance).toFixed(2)})`
                            : newBalance.toFixed(2),
                    isMultiCurrency: p.isMultiCurrency,

                    studentName: student ? student.name : '—',
                    currencyName: currency ? currency.currencyName : '—',
                    debitAccountName: debitAccount ? debitAccount.accountIdentifier : '—',
                    creditAccountName: creditAccount ? creditAccount.accountIdentifier : '—',
                };
            });
        },
        memoData() {
            return this.memos.map(p => {

                const student = this.students.find(s => s.id === p.studentId);
                const currency = this.currencies.find(c => c.id === p.currencyId);
                const debitAccount = this.accountsList.find(a => a.id === p.debitGlId);
                const creditAccount = this.accountsList.find(a => a.id === p.creditGlId);

                const amountToCredit = parseFloat(p.amountToCredit) || 0;
                const buyRate = parseFloat(p.rate) || 1;
                const amountDue = parseFloat(p.amountDue) || 0;

                const convertedAmount = p.isMultiCurrency
                    ? amountToCredit * buyRate
                    : amountToCredit;

                const newBalance = amountDue - convertedAmount;
                const academicYear = this.academicYears.find(a => a.id === p.academicYearId);
                const term = this.terms.find(a => a.id === p.termId);
                const yearName = academicYear ? academicYear.name : '—';
                const termName = term ? term.name : '—';
                const period = `${yearName} - ${termName}`;

                return {
                    id: p.id,
                    tenantId: p.tenantId,
                    studentId: p.studentId,
                    academicYearId: p.academicYearId,
                    termId: p.termId,
                    classId: p.classId,
                    currencyId: p.currencyId,
                    paymentMethod: p.paymentMethod,

                    debitGlId: p.debitGlId,
                    creditGlId: p.creditGlId,
                    bankGlId: p.bankGlId,

                    bankId: p.bankId,
                    bankBranchId: p.bankBranchId,

                    legalGuardianId: p.legalGuardianId,
                    byLegalGuardian: p.byLegalGuardian,
                    paymentDate: p.date,
                    batchNumber: p.batchNumber || '—',
                    receiptNumber: p.receiptNumber || '—',
                    referenceNumber: p.referenceNumber,
                    description: p.description,
                    amountDue,
                    amountToCredit,
                    buyRate,
                    convertedAmount,
                    newBalance: newBalance,
                    period: period,
                    newBalanceDisplay:
                        newBalance < 0
                            ? `(${Math.abs(newBalance).toFixed(2)})`
                            : newBalance.toFixed(2),
                    isMultiCurrency: p.isMultiCurrency,

                    studentName: student ? student.name : '—',
                    currencyName: currency ? currency.currencyName : '—',
                    debitAccountName: debitAccount ? debitAccount.accountIdentifier : '—',
                    creditAccountName: creditAccount ? creditAccount.accountIdentifier : '—',
                };
            });
        },
        billData() {
            const data = [];

            (this.bills || []).forEach(b => {
                const billedStudents = b.students.filter(s => s.toBeBilled);
                const totalBillAmount = billedStudents.reduce((sum, s) => sum + (s.amount || 0), 0);
                
                // nested student rows for the detail grid
                const students = billedStudents.map(sRel => {
                    const student = this.students.find(s => s.id === sRel.studentId);
                    return {
                        studentId:   sRel.studentId,
                        studentName: student ? student.name : '—',
                        className:   this.getClassName(student?.classId),
                        amount:      sRel.amount || 0,
                    };
                });

                const details = b.details?.map(d => {
                    let feeItemName = '—';
                    if (b.billTypeId === 1) feeItemName = this.feeItems.find(f => f.id === d.feeItemId)?.description || '—';
                    if (b.billTypeId === 2) feeItemName = this.supplementaryItems.find(f => f.id === d.feeItemId)?.name || '—';
                    if (b.billTypeId === 3) feeItemName = this.boardItems.find(f => f.id === d.feeItemId)?.name || '—';

                    return {
                        feeItemId:   d.feeItemId,
                        feeItemName,
                        amount:      d.amount,
                    };
                });
                const academicYear = this.academicYears.find(a => a.id === b.academicYearId);
                const term = this.terms.find(a => a.id === b.termId);
                const yearName = academicYear ? academicYear.name : '—';
                const termName = term ? term.name : '—';
                const period = `${yearName} - ${termName}`;
                data.push({
                    id:               b.id,
                    tenantId:         b.tenantId,
                    billNumber:       b.billNumber,
                    batchNumber:      b.batchNumber,
                    billDate:         b.billDate,
                    billTypeId:       b.billTypeId,
                    billTypeName:     this.billTypes.find(bt => bt.id === b.billTypeId)?.name || '—',
                    billingScopeId:   b.billingScopeId,
                    billingScopeName: this.billScopes.find(bs => bs.id === b.billingScopeId)?.name || '—',
                    academicYearId:   b.academicYearId,
                    termId:           b.termId,
                    classId:          b.classId,
                    levelId:          b.levelId,
                    period: period,
                    totalBillAmount,
                    students,         // ← nested for detail grid
                    details
                });
            });
            // SEARCH
            if (!this.searchText) return data;

            const search = this.searchText.toLowerCase().trim();

            return data.filter(p =>
                (p.studentName || '').toLowerCase().includes(search) ||
                (p.billNumber || '').toLowerCase().includes(search) ||
                (p.feeItemName || '').toLowerCase().includes(search)
            );
        }
      
    },
    methods: {
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        formatDate(dateInput) {
            return moment(dateInput).format("YYYY-MM-DD");
        },
        loadData() {
           return axios.all([
                axios.get('/SmBillingAndPayments/GetStudentBills'),
                axios.get('/SmBillingAndPayments/GetPayments/'),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllLevels/'),
                axios.get('/LedgerSetups/GetChartOfAccountDetails'),
                axios.get('/SmBillingAndPayments/GetPaymentAccounts/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmBillingAndPayments/GetMemos/'),
                axios.get('/SmBillingAndPayments/GetBills'),
                axios.get('/SmMainSetups/GetBoardingItems'),
                axios.get('/SmMainSetups/ListAllFeesDescriptions/'),
                axios.get('/SmMainSetups/ListAllSupplementaryItems/'),
                axios.get('/SharedResource/GetCurrencys'),
                axios.get(`/jsonDataSample/billingScope.json?v=${new Date().getTime()}`),
                axios.get(`/jsonDataSample/billTypes.json?v=${new Date().getTime()}`),
            ]).then(axios.spread((bills, payments, years, term, classes, mainClasses, streams, levels,  accounts, defaultAccounts, students, memos, mBills, bItems, fItems, sItems, currencies, billScopes, billTypes ) => {

                this.students = students.data;
                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName} `.trim();
                });
                this.academicYears = years.data;
                this.terms = term.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.levels = levels.data;
                this.studentBills = bills.data;
                this.payments = payments.data.filter(p => !p.isCanceled && p.isProcessed && !p.isPosted );
                this.accountsList = accounts.data.accountDetails;
                this.defaultAccounts = defaultAccounts.data[0];
                this.memos = memos.data.filter(m => !m.isCanceled && m.isProcessed && !m.isPosted)
                this.bills = mBills.data.filter(b => !b.isCancelled && b.isProcessed && !b.isPosted);
                this.memos.forEach(p => {
                    p.date = this.formatDate(p.date);
                });
                this.bills.forEach(b => {
                    b.billDate = this.formatDate(b.billDate);
                });
                this.payments.forEach(p => {
                    p.paymentDate = this.formatDate(p.paymentDate);
                });
                this.boardItems = bItems.data;
                this.feeItems = fItems.data;
                this.supplementaryItems = sItems.data;
                this.currencies = currencies.data;
                this.billTypes = billTypes.data;
                this.billScopes = billScopes.data;
                this.initDropdowns();
               
            }));
        },
        initTables(){
            this.paymentDataTable(this.paymentData);
            this.memoDataTable(this.memoData);
            this.billDataTable(this.billData);
        },
        getSchoolProfile() {
            return axios.get('/SmMainSetups/GetSchoolProfile/').then(response => {

                this. schData = response.data;
                
            }).catch(err => {
                console.log(err);
            });
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getClassName(classId) {
            const cls = this.allLevelClasses.find(c => c.id === classId);
            return cls ? cls.name : '';
        },
        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);
           
            const levelClassDropdown = this.getLevelClasses(this.levelId);
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.classList = levelClassDropdown;
            $('#classId').ejDropDownList({
                dataSource: this.classList,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.classId = args.value;
                }
            });
            $('#levelId').ejDropDownList({
                dataSource: this.levels,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "levelName", value: "id" },
                change: args => {
                    this.levelId = args.value;
                    this.filterClassesByLevel(args.value);
                }
            });
          
        },
        filterBills() {
            if (!this.billTypeId) {
                this.billDataTable(this.billData); // show all
                return;
            }
            const id = parseInt(this.billTypeId);
            const filtered = this.billData.filter(b => b.billTypeId === id);
            this.billDataTable(filtered);
        },
        filterPayments() {
            const filtered = this.paymentData.filter(p => p.academicYearId === this.academicYearId && p.termId === this.termId);
            this.paymentDataTable(filtered);
        },
        filterMemos(academicYearId, termId) {
            const filtered = this.memoData.filter(m => m.academicYearId === academicYearId && m.termId === termId);
            this.memoDataTable(filtered);
        },
        getLevelClasses(levelId) {
            if (!levelId) {
                return this.classes.map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
            }

            return this.classes
                .filter(c => c.levelId === levelId)
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
        },
        filterClassesByLevel(levelId) {

            const filtered = this.getLevelClasses(levelId);

            filtered.sort((a, b) => a.name.localeCompare(b.name));

            this.classList = filtered;

            // reset selected class when level changes
            this.classId = null;

            // rebind dropdown
            $('#classId').ejDropDownList({
                dataSource: this.classList,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" }
            });
        },
        filterStudentsByClass(classId) {
            // Get student IDs that have bills
            const billedStudentIds = new Set(
                this.studentBills
                    .filter(b =>
                        b.academicYearId === this.academicYearId &&
                        b.termId === this.termId
                    )
                    .map(b => b.studentId)
            );

            // Only students with bills, then filter by class
            const filtered = this.students
                .filter(s =>
                    billedStudentIds.has(s.id) &&
                    s.classId === classId
                )
                .sort((a, b) => a.name.localeCompare(b.name));

            // Reset student selection
            this.studentId = null;

            $('#studentId').ejDropDownList({
                dataSource: filtered,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: (args) => {
                    this.studentId = args.value;
                }
            });
        },
        getSelectedPayments() {
            let obj = $("#paymentDataTable").ejGrid("instance"), rec = []; this.selectedPayments = [];
            let check = obj.checkSelectedRowsIndexes;
            if (check.length)
            {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getPaymentRecords(pageInx, check[pageInx], obj, rec);
                }
            }
            this.selectedPayments = rec;
        },
        getPaymentRecords(pageInx, inx, proxy, rec) {
            if (inx.length) {
                for (let i = 0; i < inx.length; i++) {
                    let pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    let data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;
        },
        getSelectedMemos() {
            let obj = $("#memoDataTable").ejGrid("instance"), rec = []; this.selectedMemos = [];
            let check = obj.checkSelectedRowsIndexes;
            if (check.length)
            {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getMemoRecords(pageInx, check[pageInx], obj, rec);
                }
            }
            this.selectedMemos = rec;
        },
        getMemoRecords(pageInx, inx, proxy, rec) {
            if (inx.length) {
                for (let i = 0; i < inx.length; i++) {
                    let pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    let data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;

        },
        getSelectedBills() {
            let obj = $("#billDataTable").ejGrid("instance"),
                rec = [];
            this.selectedBills = [];
            let check = obj.checkSelectedRowsIndexes;
            if (check.length)
            {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getBillRecords(pageInx, check[pageInx], obj, rec);
                }
            }
            this.selectedBills = rec;
        },
        getBillRecords(pageInx, inx, proxy, rec) {
            if (inx.length) {
                for (let i = 0; i < inx.length; i++) {
                    let pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    let data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;

        },
        getLevelId(classId) {
            const classObj = this.classes.find(c => c.id === classId);
            return classObj ? classObj.levelId : null;
        },
        paymentDataTable(paymentData) {
            $("#paymentDataTable").ejGrid({
                dataSource: paymentData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                allowScrolling: true,
                scrollSettings: { width: "100%" },
                selectionSettings: {
                    selectionMode: ej.Grid.SelectionMode.Multiple,
                    selectionType: ej.Grid.SelectionType.CheckBox
                },
                toolbarSettings: {showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search]},
                columns: [
                    {field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true},
                    { type: "checkbox", width: 20 },
                    { field:  "period",           headerText: "Period",        width: 110},
                    {field: "studentName", headerText: "Student", textAlign: ej.TextAlign.Left, width: 140},
                    {field: "paymentDate", headerText: "Date", width: 80, format: "{0:yyyy-MM-dd}"},
                    {field: "batchNumber", headerText: "Batch #", width: 80},
                    {field: "amountDue", headerText: "Amt Due", width: 80, format: "{0:n2}"},
                    {field: "amountToPaid", headerText: "Amount", width: 80, format: "{0:n2}"},
                    {field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 80},
                    {field: "buyRate", headerText: "Rate", width: 40, format: "{0:n4}"},
                    {field: "convertedAmount", headerText: "FX Amt", width: 80, format: "{0:n2}"},
                    {field: "newBalanceDisplay", headerText: "Balance", width: 80, format: "{0:n2}"},
                    {field: "tenantId", visible: false, headerText: "Tenant Id", width: 15}
                ],
            });
        },
        memoDataTable(memoData) {
            $("#memoDataTable").ejGrid({
                dataSource: memoData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                allowScrolling: true,
                scrollSettings: { width: "100%" },
                selectionSettings: {
                    selectionMode: ej.Grid.SelectionMode.Multiple,
                    selectionType: ej.Grid.SelectionType.CheckBox
                },
                toolbarSettings: {showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search]},
                columns: [
                    {field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true},
                    { type: "checkbox", width: 20 },
                    { field:  "period",           headerText: "Period",        width: 110},
                    {field: "studentName", headerText: "Student", textAlign: ej.TextAlign.Left, width: 140},
                    {field: "paymentDate", headerText: "Date", width: 80, format: "{0:yyyy-MM-dd}"},
                    {field: "batchNumber", headerText: "Batch #", width: 80},
                    {field: "amountDue", headerText: "Amt Due", width: 80, format: "{0:n2}"},
                    {field: "amountToCredit", headerText: "Amount", width: 80, format: "{0:n2}"},
                    {field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 80},
                    {field: "buyRate", headerText: "Rate", width: 40, format: "{0:n4}"},
                    {field: "convertedAmount", headerText: "FX Amt", width: 80, format: "{0:n2}"},
                    {field: "newBalanceDisplay", headerText: "Balance", width: 80, format: "{0:n2}"},
                    {field: "tenantId", visible: false, headerText: "Tenant Id", width: 15}
                ],
            });
        },
        billDataTable(billData) {
            const $grid = $("#billDataTable");
            const gridObj = $grid.data("ejGrid");

            if (gridObj) {
                gridObj.dataSource(billData);
                return;
            }

            $grid.ejGrid({
                dataSource: billData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                allowScrolling: true,
                pageSettings: { pageSize: 10 },
                scrollSettings: { width: "100%" },
                showSummary: true,
                summaryRows: [
                    {
                        title: "",
                        showTotalSummary: true,
                        summaryColumns: [
                            { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "totalBillAmount", dataMember: "totalBillAmount", format: "{0:n2}" },
                        ]
                    }
                ],
                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [ej.Grid.ToolBarItems.Search]
                },
                columns: [
                    { field: "id",               headerText: "ID",          isPrimaryKey: true, visible: false },
                    { type:  "checkbox", width: 20 },
                    { field:  "period",           headerText: "Period",        width: 110},
                    { field: "billNumber",       headerText: "Bill #",       width: 110 },
                    { field: "batchNumber",      headerText: "Batch #",      width: 110 },
                    { field: "billTypeName",     headerText: "Bill Type",    width: 110 },
                    { field: "billingScopeName", headerText: "Scope",        width: 100 },
                    { field: "billDate",         headerText: "Date",         width: 100, format: "{0:yyyy-MM-dd}" },
                    { field: "totalBillAmount",  headerText: "Total Amount", width: 120, format: "{0:n2}" },
                ],

                // Single template with two sections
                detailsTemplate: `
            <div style="padding: 10px;">
             <strong>Applied Fee Items</strong>
                <div class="detail-detail-grid"></div>
             <br/>
                <strong>Billed Students</strong>
                <div class="student-detail-grid"></div>
            </div>
        `,

                // Single callback — initialize both grids here
                detailsDataBound: (args) => {
                    const students = args.data.students || [];
                    const details  = args.data.details  || [];

                    $(args.detailsElement).find(".student-detail-grid").ejGrid({
                        dataSource: students,
                        allowPaging: students.length > 10,
                        pageSettings: { pageSize: 10 },
                        columns: [
                            { field: "studentId",   headerText: "ID",      isPrimaryKey: true, visible: false },
                            { field: "studentName", headerText: "Student", width: 180 },
                            { field: "className",   headerText: "Class",   width: 120 },
                            { field: "amount",      headerText: "Amount",  width: 120, format: "{0:n2}" },
                        ]
                    });

                    $(args.detailsElement).find(".detail-detail-grid").ejGrid({
                        dataSource: details,
                        allowPaging: details.length > 5,
                        pageSettings: { pageSize: 5 },
                        columns: [
                            { field: "feeItemId",   headerText: "ID",       isPrimaryKey: true, visible: false },
                            { field: "feeItemName", headerText: "Fee Item", width: 180 },
                            { field: "amount",      headerText: "Amount",   width: 120, format: "{0:n2}" },
                        ]
                    });
                },
            });
        },
        async postPayments() {
            this.getSelectedPayments();

            if (!this.selectedPayments.length) {
                this.toastHandler('warning', 'Please select a payment to post.');
                return;
            }

            this.isLoading = true;

            let payload = {
                paymentIds: this.selectedPayments.map(a => a.id)
            };
            const result = await Swal.fire({
                title: 'Confirm',
                html: `
                <div style="text-align:center">
                    <p>Are you sure you want to post selected payments to GL?</p>
                    <p style="color: #f00a0a"><strong><i class="la la-exclamation-circle"></i> This action cannot be reversed</strong></p>
                </div>
            `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Proceed',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) {
                return;
            }
            axios.post('/SmBillingAndPayments/PostPayments', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', response.data.message);
                        this.loadData();
                    } else {
                        this.toastHandler('warning', response.data.message);
                    }
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to post payment.');
                    this.isLoading = false;
                });
        },
        async postMemos() {
            this.getSelectedMemos();

            if (!this.selectedMemos.length) {
                this.toastHandler('warning', 'Please select a memo to post.');
                return;
            }

            this.isLoading = true;

            let payload = {
                memoIds: this.selectedMemos.map(a => a.id)
            };
            const result = await Swal.fire({
                title: 'Confirm',
                html: `
                <div style="text-align:center">
                    <p>Are you sure you want to post selected credit memos to GL?</p>
                    <p style="color: #f00a0a"><strong><i class="la la-exclamation-circle"></i> This action cannot be reversed</strong></p>
                </div>
            `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Proceed',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) {
                return;
            }
            axios.post('/SmBillingAndPayments/PostMemos', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', response.data.message);
                        this.loadData();
                    } else {
                        this.toastHandler('warning', response.data.message);
                    }
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to post payment.');
                    this.isLoading = false;
                });
        },
        async postBills() {
            this.getSelectedBills();

            if (this.schData.currencyId == null || this.schData.currencyId === '' || this.schData.currencyId === this.emptyGuid) {
                this.toastHandler('warning', 'Please add local currency at school Profile before proceeding')
                return
            }
            
            if (!this.selectedBills.length) {
                this.toastHandler('warning', 'Please select a bill to post.');
                return;
            }

            this.isLoading = true;

            let payload = {
                billIds: this.selectedBills.map(a => a.id)
            };
            const result = await Swal.fire({
                title: 'Confirm',
                html: `
                <div style="text-align:center">
                    <p>Are you sure you want to post selected bills to GL?</p>
                    <p style="color: #f00a0a"><strong><i class="la la-exclamation-circle"></i> This action cannot be reversed</strong></p>
                </div>
            `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Proceed',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) {
                return;
            }
            axios.post('/SmBillingAndPayments/PostBills', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', response.data.message);
                        this.loadData();
                    } else  {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Bill Account Setup Required',
                            html: `
                <div style="text-align:center">
                    <p>${response.data.message}</p>
                </div>
            `,
                            confirmButtonText: 'OK'
                        });
                    }

                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to post payment.');
                    this.isLoading = false;
                });
        },
        toastHandler(type, message = 'An unexpected error occurred.') {
            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };
            switch (type) {

                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }
        },
        resetTables() {
            this.paymentDataTable(this.paymentData);
            this.memoDataTable(this.memoData);
            this.billDataTable(this.billData);
        }
    },
    watch: {
        billTypeId(val){
            this.filterBills();
        },
       
    },
    async mounted() {
        await this.loadData();
        await this.getSchoolProfile();
        await this.initTables();
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');