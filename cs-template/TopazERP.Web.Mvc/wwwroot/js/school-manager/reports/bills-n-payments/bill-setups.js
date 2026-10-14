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
            endDate: moment().format("YYYY-MM-DD"),
            payments: [],
            isShimmerLoading: true,
            reportApiBaseUrl:'',
            levelClasses: [],
            classId: '',
            reportHeader: null,
            showDetails: false,
            title:'Bill SetUp',
            feeType: "All",
            feeTypes: [
                { id: "All", name: "All" },
                { id: "Standard", name: "Standard" },
                { id: "Supplementary", name: "Supplementary" },
                { id: "Boarding", name: "Boarding" },
                { id: "Standard,Supplementary", name: "Standard & Supplementary" }
            ],
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1785491792/erp-reports/school-manager/bill-setup_qjxvmy.rdl',
                detailsReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1785493919/erp-reports/school-manager/bill-setup-details_qglfv5.rdl',
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

        filterFeeTypes(details) {

            if (this.feeType === "All") {
                return details;
            }

            const selectedTypes = this.feeType
                .split(',')
                .map(x => x.trim().toLowerCase());

            return details.filter(x =>
                selectedTypes.includes(x.feeType.toLowerCase())
            );
        },
        searchReport() {
            this.isLoading = true;

            if (!this.classId) {
                this.toastHandler('warning', 'Please select a class.');
                this.isLoading = false;
                return;
            }

            if (!this.academicYearId) {
                this.toastHandler('warning', 'Please select an academic year.');
                this.isLoading = false;
                return;
            }

            if (!this.termId) {
                this.toastHandler('warning', 'Please select a term.');
                this.isLoading = false;
                return;
            }

            // Build report title
            const className = this.getClassName(this.classId);
            const termName = this.terms.find(t => t.id === this.termId)?.name || '';
            const academicYearName = this.academicYears.find(y => y.id === this.academicYearId)?.name || '';

            this.title = `${this.feeType} Bill Setups for Class: '${className}' for '${termName}' '${academicYearName}'`;

            this.url = `/SmReports/GetFeeSetupItems?academicYearId=${this.academicYearId}&termId=${this.termId}&classId=${this.classId}&title=${encodeURIComponent(this.title)}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;
            if (this.showDetails) {
                this.url = `/SmReports/GetStudentBills?academicYearId=${this.academicYearId}&termId=${this.termId}&classId=${this.classId}&title=${encodeURIComponent(this.title)}`;
                this.reportPath = this.reportPathConfig.detailsReportPath;
            }
            axios.get(this.url)
                .then(response => {
                    const header = response.data.reportHeader;
                    this.header = header;
                    const details = response.data.reportDetails;

                    const filteredDetails = this.filterFeeTypes(details);

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
    },
    watch: {
        showDetails: {
            handler(value) {
                this.feeType = value ? "Supplementary" : "All";
            },
            immediate: true
        }
    },
    async mounted() {
        await Promise.all([
            this.getAcademicYears(),
            this.getTerms(),
            this.loadData()
        ]);
        this.initDropdowns();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');