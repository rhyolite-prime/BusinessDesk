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
            startDate: moment().format("YYYY-MM-DD"),
            payments: [],
            isShimmerLoading: true,
            reportApiBaseUrl:'',
            levelClasses: [],
            classId: '',
            reportHeader: null,
            showDetails: false,
            title:'',
            reportType: "All",
            reportTypes: [
                { id: "All", name: "All" },
                { id: "PaidUps", name: "Paid Up Students" },
                { id: "Debtors", name: "Student Debtors" },
            ],
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1785498263/erp-reports/school-manager/student-account-status_kwvliu.rdl',
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
        loadData() {
            return axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((classes, mainClasses, streams) => {
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
            }));
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

        filterReport(details) {

            if (this.reportType === "All") {
                return details;
            }

            const selectedTypes = this.reportType
                .split(',')
                .map(x => x.trim().toLowerCase());

            return details.filter(x =>
                selectedTypes.includes(x.type.toLowerCase())
            );
        },
        searchReport() {
            this.isLoading = true;

            if (!this.classId) {
                this.toastHandler('warning', 'Please select a class.');
                this.isLoading = false;
                return;
            }
            

            this.url = `/SmReports/GetStudentAccountStatus?classId=${this.classId}&asAtDate=${this.startDate}&title=${encodeURIComponent(this.title)}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;
           
            axios.get(this.url)
                .then(response => {
                    const header = response.data.reportHeader;
                    this.header = header;
                    const details = response.data.reportDetails;
                    
                    const filteredDetails = this.filterReport(details).sort((a, b) => a.studentIdentifier.localeCompare(b.studentIdentifier));
                    
                    this.renderReport(header, filteredDetails, this.reportPath);
                    this.isLoading = false;

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
        updateTitle() {
            const className = this.getClassName(this.classId);

            if (this.reportType === "PaidUps") {
                this.title = `List Of Paid Up Students: '${className}' as at '${this.startDate}'`;
            }
            else if (this.reportType === "Debtors") {
                this.title = `List Of Student Debtors: '${className}' as at '${this.startDate}'`;
            }
            else {
                this.title = `Students Account Status: '${className}' as at '${this.startDate}'`;
            }
        },
    },
    watch: {
        reportType: {
            handler() {
                this.updateTitle();
            },
            immediate: true
        }
    },
    async mounted() {
        await Promise.all([
            this.loadData()
        ]);
        this.initDropdowns();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');