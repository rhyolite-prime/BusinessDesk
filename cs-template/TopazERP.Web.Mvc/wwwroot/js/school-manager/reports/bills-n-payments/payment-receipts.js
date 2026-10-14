const app = Vue.createApp({
    data() {
        return {
            payments: [],
            students:[],
            classes: [],
            mainClasses: [],
            streams: [],
            classId: '',
            isShimmerLoading: false,
            isLoading: false,
            classList: [],
            classStudents:[],
            className: '',
            reportApiBaseUrl: '',
            studentId: '',
            paymentId: '',
            studentPayments: [],
            reports:[],
            receiptSearch: "",
            receiptPage: 1,
            pageSize: 10,
            paymentIds:[],
            printAllReceipts: true,
            selectedReceipt: 0,
            reportHeader: null,
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1783949137/erp-reports/school-manager/SchPaymentReceipt_ht803d.rdl',
            },
        }
    },
    computed:{

        filteredReceipts(){

            if(!this.receiptSearch)
                return this.reports;

            const search=this.receiptSearch.toLowerCase();

            return this.reports.filter(r=>

                r.receiptNo.toLowerCase().includes(search) ||

                r.studentName.toLowerCase().includes(search)

            );

        },

        totalPages(){

            return Math.max(1,Math.ceil(this.filteredReceipts.length/this.pageSize));

        },

        pagedReceipts(){

            const start=(this.receiptPage-1)*this.pageSize;

            return this.filteredReceipts.slice(start,start+this.pageSize);

        }

    },
    methods: {
        async searchReport() {
            this.isLoading = true;

            if (!this.classId) {
                this.toastHandler('warning', 'Please select a class.');
                this.isLoading = false;
                return;
            }

            if (!this.printAllReceipts && !this.studentId) {
                this.toastHandler('warning', 'Please select a student.');
                this.isLoading = false;
                return;
            }

            if (!this.printAllReceipts && !this.paymentId) {
                this.toastHandler('warning', 'Please select a payment.');
                this.isLoading = false;
                return;
            }

            this.reportPath = this.reportPathConfig.summaryReportPath;

            // ============================
            // PRINT ALL RECEIPTS
            // ============================
            if (this.printAllReceipts) {

                const paymentIds = this.studentPayments.map(x => x.id);

                if (!paymentIds.length) {
                    this.toastHandler('warning', 'No payments found.');
                    this.isLoading = false;
                    return;
                }

                try {

                    // ONE API CALL
                    const response = await axios.post('/SmReports/GetAllPaymentReceipts', {
                        paymentIds: paymentIds
                    });

                    // One report container per receipt

                    this.reportHeader = response.data.reportHeader;
                    this.reports = response.data.reportDetails;

                    await this.$nextTick();

                    if (this.reports.length) {
                        this.showReceipt(0);
                    }

                } catch (err) {

                    console.error(err);

                    this.toastHandler(
                        'error',
                        'Unable to get receipts.'
                    );
                }

                this.isLoading = false;
                return;
            }

            // ============================
            // SINGLE RECEIPT
            // ============================

            const url =
                `/SmReports/GetPaymentReceipt?paymentId=${this.paymentId}&studentId=${this.studentId}`;

            axios.get(url)
                .then(response => {

                    this.renderReport(
                        response.data.reportHeader,
                        response.data.reportDetails,
                        this.reportPath
                    );

                    this.isLoading = false;

                })
                .catch(err => {

                    console.error(err);

                    this.toastHandler(
                        'error',
                        'Unable to get data.'
                    );

                    this.isLoading = false;
                });
        },
        showReceipt(index) {

            this.selectedReceipt = index;

            $("#reportView").empty();

            this.renderReport(
                this.reportHeader,
                [this.reports[index]],
                this.reportPathConfig.summaryReportPath
            );
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
        formatDate(date) {
            if (!date) return '';
            const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
            return new Date(date).toLocaleDateString('en-US', options);
        },
        getPayments() {
            return axios.get('/SmBillingAndPayments/GetPayments/').then(res => {
                this.payments = res.data.filter(p => !p.isCancelled);
                this.payments.forEach(payment => {
                    payment.name = `${this.formatDate(payment.paymentDate)} - ${payment.receiptNumber}`;
                });
                this.payments.sort((a, b) => b.paymentDate - a.paymentDate);
            });
        },
        getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/').then(res => {
                this.students = res.data;
                this.students.forEach(student => {
                    student.name = `${student.lastName} ${student.otherName} ${student.firstName}`;
                    student.displayText = `${student.studentIdentifier} - ${student.name}`;
                });
                this.students.sort((a, b) => a.name.localeCompare(b.name));
            });
        },
        getClasses() {
            return axios.get('/SmMainSetups/ListAllLevelClasses/').then(res => {
                this.classes = res.data;
            });
        },

        getMainClasses() {
            return axios.get('/SmMainSetups/ListAllClasses/').then(res => {
                this.mainClasses = res.data;
            });
        },

        getStreams() {
            return axios.get('/SmMainSetups/ListAllStreams/').then(res => {
                this.streams = res.data;
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
            const levelClassDropdown = this.getLevelClasses();
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.classList = levelClassDropdown;
        },
        getLevelClasses() {
            return this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
        },
        getAllClasses(classId) {
            return this.classes
                .filter(c => c.id === classId)
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`
                }));
        },
        filterStudents(classId) {
            return this.classStudents = this.students.filter(student => student.classId === classId);
        },
        getStudentPayment(studentId) {
            this.studentPayments = this.payments.filter(
                payment => payment.studentId === studentId
            );
        },
        getClassPayment(classId) {
            this.studentPayments = this.payments.filter(payment => payment.classId === classId);
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
        classId(newVal) {
            this.filterStudents(newVal);
            this.getClassPayment(newVal);
        },
        studentId(newVal) {
             this.getStudentPayment(newVal);
        }
    },
    async mounted() {

        await Promise.all([
            this.getPayments(),
            this.getStudents(),
            this.getMainClasses(),
            this.getStreams(),
            this.getClasses(),
        ]);
        this.initDropdowns();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');