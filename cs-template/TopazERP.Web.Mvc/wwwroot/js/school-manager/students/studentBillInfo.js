const app = Vue.createApp({
    data() {
        return {
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            levels: [],
            academicYearId: '',
            termId: '',
            studentBills: [],
            students: [],
            payments: [],
            isShimmerLoading: true,
        }
    },
    computed: {
        allLevelClasses() {
            return this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`
            }));
        },
    },
    methods: {
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
                axios.get('/SmStudentSetups/ListAllStudents/'),
            ]).then(axios.spread((bills, payments, years, term, classes, mainClasses, streams, levels, students) => {
                this.studentBills = bills.data.filter(b => !b.isCanceled);
                this.academicYears = years.data;
                this.terms = term.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.students = students.data;
                this.payments = payments.data.filter(p => !p.isCanceled && p.isProcessed )

                // Enrich bill rows (no amountPaid/balanceDue needed here)
                this.studentBills.forEach(bill => {
                    const student = this.students.find(s => s.id === bill.studentId);
                    bill.name = student ? `${student.firstName} ${student.otherName} ${student.lastName}` : '';
                    bill.studentIdentifier = student?.studentIdentifier || '';
                    bill.className = student?.classId ? this.getClassName(student.classId) : '';
                    bill.billDate = this.formatDate(bill.billDate);
                });

                this.initDropdowns();
                this.filterStudentBills();
            }));
        },

        // ─── Build summary rows ───────────────────────────────────────────
        computeStudentSummaries(bills) {
            const map = new Map();

            bills.forEach(bill => {
                const key = `${bill.studentId}|${bill.academicYearId}|${bill.termId}`;

                if (!map.has(key)) {
                    map.set(key, {
                        studentId:      bill.studentId,
                        academicYearId: bill.academicYearId,
                        termId:         bill.termId,
                        name:           bill.name,
                        studentIdentifier: bill.studentIdentifier,
                        className:      bill.className,
                        totalBillAmount: 0,
                        totalPaid:       0,
                        balanceDue:      0,
                        bills: [],
                    });
                }

                const row = map.get(key);
                row.totalBillAmount += Number(bill.amount) || 0;
                row.bills.push(bill);
            });

            // Sum payments per student+year+term
            map.forEach((row, key) => {
                const [studentId, academicYearId, termId] = key.split('|');
                const studentPayments = this.payments.filter(p =>
                    String(p.studentId)      === String(studentId) &&
                    String(p.academicYearId) === String(academicYearId) &&
                    String(p.termId)         === String(termId)
                );
                row.totalPaid  = studentPayments.reduce((sum, p) => sum + (Number(p.amountToPaid) || 0), 0);
                row.balanceDue = row.totalBillAmount - row.totalPaid;
            });

            return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        },

        // ─── Helpers ──────────────────────────────────────────────────────
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
        formatDate(dateStr) {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleDateString('en-GB');
        },

        // ─── Dropdowns ────────────────────────────────────────────────────
        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);
            if (activeYear) this.academicYearId = activeYear.id;
        },

        // ─── Filter → build summaries → render ───────────────────────────
        filterStudentBills() {
            let bills = [...this.studentBills];

            if (this.academicYearId) bills = bills.filter(b => b.academicYearId === this.academicYearId);
            if (this.termId)         bills = bills.filter(b => b.termId         === this.termId);

            const summaries = this.computeStudentSummaries(bills);
            this.dataTable(summaries);
        },

        // ─── Master-detail grid ───────────────────────────────────────────
        dataTable(summaries) {
            const gridObj = $("#dataTable").data("ejGrid");

            if (gridObj) {
                gridObj.dataSource(summaries);
                return;
            }

            $("#dataTable").ejGrid({
                dataSource: summaries,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                allowScrolling: true,
                scrollSettings: { width: "100%" },
                pageSettings: { pageSize: 10 },
                showSummary: true,
                summaryRows: [
                    {
                        title: "Grand Total",
                        showTotalSummary: true,
                        summaryColumns: [
                            { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "totalBillAmount", dataMember: "totalBillAmount", format: "{0:n2}" },
                            { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "totalPaid",       dataMember: "totalPaid",       format: "{0:n2}" },
                            { summaryType: ej.Grid.SummaryType.Sum, displayColumn: "balanceDue",      dataMember: "balanceDue",      format: "{0:n2}" },
                        ]
                    }
                ],
                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search]
                },
                columns: [
                    { field: "studentId",         headerText: "ID",             isPrimaryKey: true, visible: false },
                    { field: "name",              headerText: "Student Name",    width: 180 },
                    { field: "studentIdentifier", headerText: "Student ID",      width: 110 },
                    { field: "className",         headerText: "Class",           width: 130 },
                    { field: "totalBillAmount",   headerText: "Total Bill Amount", width: 130, format: "{0:n2}" },
                    { field: "totalPaid",         headerText: "Paid Amount", width: 130, format: "{0:n2}" },
                    { field: "balanceDue",        headerText: "Balance Due", width: 130, format: "{0:n2}" },
                ],

                // ── Detail template: individual bill rows ──────────────────
                detailsDataBound: (args) => {
                    const studentBills = args.data.bills;
                    $(args.detailsElement).find(".detail-grid").ejGrid({
                        dataSource: studentBills,
                        allowPaging: studentBills.length > 5,
                        pageSettings: { pageSize: 5 },
                        columns: [
                            { field: "id",                headerText: "ID",         isPrimaryKey: true, visible: false },
                            { field: "billDate",          headerText: "Bill Date",   width: 100 },
                            { field: "billNumber",        headerText: "Bill #",      width: 100 },
                            { field: "amount",            headerText: "Amount", width: 120, format: "{0:n2}" },
                            { field: "amountPaid",            headerText: "Paid", width: 120, format: "{0:n2}" },
                            { field: "balanceDue",            headerText: "Balance", width: 120, format: "{0:n2}" },
                        ]
                    });
                },
                detailsTemplate: '<div class="detail-grid"></div>',
            });
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = { closeButton: true, progressBar: true, showMethod: 'fadeIn', hideMethod: 'fadeOut', timeOut: 10000 };
            switch (type) {
                case 'warning': toastr.warning('', message); break;
                case 'error':   toastr.error('', message);   break;
                default:        toastr.success('', message); break;
            }
        },
    },
    watch: {
        termId(newVal, oldVal) {
            if (newVal === oldVal) return;
            this.filterStudentBills();
        },
        academicYearId(newVal, oldVal) {
            if (newVal === oldVal) return;
            this.filterStudentBills();
        }
    },
    async mounted() {
        await this.loadData();
    },
});
app.component('shimmer-loader', ShimmerLoader);
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');