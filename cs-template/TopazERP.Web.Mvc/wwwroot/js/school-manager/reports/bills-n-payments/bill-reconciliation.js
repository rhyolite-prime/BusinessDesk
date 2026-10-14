const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            reportType: 'type1',
            startDate: moment().format("YYYY-MM-DD"),
            endDate: moment().format("YYYY-MM-DD"),
            reportApiBaseUrl: '',
            classList: [],
            classId: '',
            mainClasses: [],
            streams: [],
            classes: [],
            levelClasses: [],
            students:[],
            bills:[],
            allBills:[],
            showSummary: false,
            url:'',
            academicYears: [],
            terms: [],
            academicYearId: '',
            termId: '',
            header: [],
            
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1784043831/erp-reports/school-manager/bill-reconciliation_lcqjwe.rdl',
                summaryReportPath1: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1784043684/erp-reports/school-manager/bill-conciliation-summary_wnvvcx.rdl',
            },
        }
    },
    methods: {
        loadClassData() {
            return axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),

            ]).then(axios.spread((classes, mainClasses, streams,) => {
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;

                this.initDropdowns();

            }));
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
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.levelClasses = levelClassDropdown;
        },
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
            });
        },
        searchReport() {
            this.isLoading = true;
            
            
            if (this.showSummary) {
                if (!this.academicYearId || !this.termId) {
                    this.toastHandler('warning', 'Please select an academic year and term.');
                    this.isLoading = false;
                    return;
                }
                this.url = `/SmReports/GetBillsReconciliationSummary?academicYearId=${this.academicYearId}&termId=${this.termId}`;
                this.reportPath = this.reportPathConfig.summaryReportPath1;
            }
            else {
                if (moment(this.startDate).isAfter(this.endDate)) {
                    this.toastHandler('warning', 'Start date cannot be greater than end date.');
                    this.isLoading = false;
                    return;
                }
                this.url = `/SmReports/GetBillsReconciliation?startDate=${this.startDate}&endDate=${this.endDate}`;
                this.reportPath = this.reportPathConfig.summaryReportPath;
            }
            axios.get(this.url)
                .then(response => {
                    const header  = response.data.reportHeader;
                    this.header = header;
                    const details = response.data.reportDetails.data;
                    this.allBills = details;
                    this.bills = [...details];
                    this.renderReport(header, details, this.reportPath);
                    this.isLoading = false;
                    // show message from response
                    if (response.data.message) {
                        this.toastHandler('warning', response.data.message);
                    }
                })
                .catch(err => {
                    this.toastHandler('warning', 'Data not found');
                    this.isLoading = false;
                });
        },
        filterBillsByClass(classId) {
            if (!classId) {
                this.bills = [...this.allBills];
            } else {
                this.bills = this.allBills.filter(bill => bill.classId === classId);
            }
            if (this.showSummary) {
                if (!this.academicYearId || !this.termId) {
                    this.toastHandler('warning', 'Please select an academic year and term.');
                    this.isLoading = false;
                    return;
                }
                this.reportPath = this.reportPathConfig.summaryReportPath1;
            }
            else {
                if (moment(this.startDate).isAfter(this.endDate)) {
                    this.toastHandler('warning', 'Start date cannot be greater than end date.');
                    this.isLoading = false;
                    return;
                }
                this.reportPath = this.reportPathConfig.summaryReportPath;
            }
            this.renderReport(this.header, this.bills, this.reportPath);
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


        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");
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
        classId(newClassId) {
            this.filterBillsByClass(newClassId);
        }
    },
    async mounted() {
        await Promise.all([
            this.loadClassData(),
            this.getAcademicYears(),
            this.getTerms()
        ]);
       // this.searchReport();
        this.reportApiBaseUrl = reportApiBaseUrl;
    }
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');