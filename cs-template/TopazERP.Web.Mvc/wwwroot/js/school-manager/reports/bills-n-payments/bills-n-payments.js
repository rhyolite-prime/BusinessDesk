const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
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
            reportApiBaseUrl:'',
            levelClasses: [],
            classId: '',
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1784810721/erp-reports/school-manager/bills-n-payments_ijhmep.rdl',
            },
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
        getAcademicYears() {
            return axios.get('/SmMainSetups/ListAllAcademicYears').then(res => {
                this.academicYears = res.data;
                const activeYear = this.academicYears.find(y => y.isActive === true);
                if (activeYear) {
                    this.academicYearId = activeYear.id;
                }
            });
        },

        getTerms() {
            return axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`).then(res => {
                this.terms = res.data;
                this.termId = res.data[0].id;
            });
        },
        loadData() {
            return axios.all([
                axios.get('/SmBillingAndPayments/GetStudentBills'),
                axios.get('/SmBillingAndPayments/GetPayments/'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllLevels/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
            ]).then(axios.spread((bills, payments, classes, mainClasses, streams, levels, students) => {
                this.studentBills = bills.data.filter(b => !b.isCanceled);
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
                this.filterStudentBills();
            }));
        },

        computeStudentSummaries(bills) {

            const map = new Map();

            const yearName = this.academicYears.find(y => y.id === this.academicYearId)?.name || '';
            const termName = this.terms.find(y => y.id === this.termId)?.name || '';

            const title = `Bills And Payments For ${yearName} - ${termName}`;


            // Calculate student totals
            bills.forEach(bill => {

                const key = `${bill.studentId}|${bill.academicYearId}|${bill.termId}`;

                if (!map.has(key)) {
                    map.set(key, {
                        totalBillAmount: 0
                    });
                }

                map.get(key).totalBillAmount += Number(bill.amount) || 0;

            });


            // Calculate payments once
            const paymentMap = new Map();

            this.payments.forEach(payment => {

                const key = `${payment.studentId}|${payment.academicYearId}|${payment.termId}`;

                if (!paymentMap.has(key)) {
                    paymentMap.set(key, 0);
                }

                paymentMap.set(
                    key,
                    paymentMap.get(key) + (Number(payment.amountToPaid) || 0)
                );

            });


            const result = [];


            bills.forEach(bill => {

                const key = `${bill.studentId}|${bill.academicYearId}|${bill.termId}`;

                const summary = map.get(key);

                const totalPaid = paymentMap.get(key) || 0;


                let billStatus = '';

                switch (bill.billStatusId) {

                    case 1:
                        billStatus = 'Not Paid';
                        break;

                    case 2:
                        billStatus = 'Partially Paid';
                        break;

                    case 3:
                        billStatus = 'Fully Paid';
                        break;

                    default:
                        billStatus = 'Unknown';
                }


                result.push({

                    // Student information
                    studentId: bill.studentId,
                    academicYearId: bill.academicYearId,
                    termId: bill.termId,

                    name: bill.name,
                    studentIdentifier: bill.studentIdentifier,
                    className: bill.className,


                    // Student totals
                    totalBillAmount: summary.totalBillAmount,
                    totalPaid: totalPaid,
                    studentBalanceDue: summary.totalBillAmount - totalPaid,


                    // Bill details
                    billNumber: bill.billNumber,
                    billDate: bill.billDate,

                    billAmount: Number(bill.amount) || 0,
                    billPaidAmount: Number(bill.amountPaid) || 0,
                    billBalanceDue: Number(bill.balanceDue) || 0,

                    billStatusId: bill.billStatusId,
                    billStatus: billStatus,


                    // Report information
                    title: title

                });

            });


            return result.sort((a,b)=>
                a.name.localeCompare(b.name)
            );
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
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.levelClasses = levelClassDropdown;
        },

        // ─── Filter → build summaries → render ───────────────────────────
        filterStudentBills() {
            let bills = [...this.studentBills];

            if (this.academicYearId) bills = bills.filter(b => b.academicYearId === this.academicYearId);
            if (this.termId)         bills = bills.filter(b => b.termId         === this.termId);

            const summaries = this.computeStudentSummaries(bills);
            this.renderReport(this.header, summaries, this.reportPath);
        },
        searchReport() {
            this.isLoading = true;
            this.url = `/SmReports/GetCancelledBills?academicYearId=${this.academicYearId}&termId=${this.termId}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;
            let bills = [...this.studentBills];

            if (this.academicYearId) bills = bills.filter(b => b.academicYearId === this.academicYearId);
            if (this.termId)         bills = bills.filter(b => b.termId         === this.termId);

            const summaries = this.computeStudentSummaries(bills);
           
            axios.get(this.url)
                .then(response => {
                    const header  = response.data.reportHeader;
                    this.header = header;
                    this.renderReport(header, summaries, this.reportPath);
                    this.isLoading = false;
                    // show message from response
                    if (response.data.message) {
                        this.toastHandler('warning', response.data.message);
                    }
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                });
        },
        renderReport(header, details, reportPath) {
            $("#reportView").empty();

            $("#reportView").boldReportViewer({
                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                toolbarSettings: {
                    showToolbar: true,
                    items: ej.ReportViewer.ToolbarItems.All &
                        ~ej.ReportViewer.ToolbarItems.Print
                },
                reportPath: reportPath,
                dataSources: [
                    {
                        value: header,
                        name: "DataSet1"
                    },
                    {
                        value: details,
                        name: "DataSet2"
                    }
                ],
                reportError: (args) => {
                    console.error('Bold Report error:', args);
                    this.toastHandler('warning', 'No data available for the selected criteria.');
                }
            });
        },

        filterBillsByClass(classId) {
            let bills = [...this.studentBills];
            // Academic filters first
            if (this.academicYearId) {
                bills = bills.filter(b =>
                    b.academicYearId === this.academicYearId
                );
            }
            if (this.termId) {
                bills = bills.filter(b =>
                    b.termId === this.termId
                );
            }
            // Class filter
            if (classId) {
                bills = bills.filter(b =>
                    b.classId === classId
                );
            }
            if (!this.academicYearId || !this.termId) {
                this.toastHandler(
                    'warning',
                    'Please select an academic year and term.'
                );
                this.isLoading = false;
                return;
            }


            // Now calculate summary from filtered bills
            const summaries = this.computeStudentSummaries(bills);


            this.reportPath = this.reportPathConfig.summaryReportPath;


            this.renderReport(
                this.header,
                summaries,
                this.reportPath
            );
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
    },
    watch: {
        termId(newVal, oldVal) {
            if (newVal === oldVal) return;
            this.filterStudentBills();
        },
        academicYearId(newVal, oldVal) {
            if (newVal === oldVal) return;
            this.filterStudentBills();
        },
        classId(newClassId) {
            this.filterBillsByClass(newClassId);
        }
       
    },
    async mounted() {
        await Promise.all([
            this.getAcademicYears(),
            this.getTerms(),
            this.loadData()
        ]);
        this.initDropdowns();
        this.searchReport();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');