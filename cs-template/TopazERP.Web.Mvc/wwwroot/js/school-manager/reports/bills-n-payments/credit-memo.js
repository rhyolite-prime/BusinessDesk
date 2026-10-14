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
            payments:[],
            allPayments:[],
            url:'',
            academicYears: [],
            terms: [],
            academicYearId: '',
            termId: '',
            header: [],
            isCanceled: false,

            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1785508404/erp-reports/school-manager/credit-memos_y8arei.rdl',
                canceledReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1785508404/erp-reports/school-manager/canceled-memos_kvt9ta.rdl',
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

            if (this.isCanceled) {

                if (!this.academicYearId || !this.termId) {
                    this.toastHandler('warning', 'Please select an academic year and term.');
                    this.isLoading = false;
                    return;
                }

                this.url = `/SmReports/GetCanceledCreditMemo?academicYearId=${this.academicYearId}&termId=${this.termId}`;
                this.reportPath = this.reportPathConfig.canceledReportPath;
            }
            else {

                if (moment(this.startDate).isAfter(this.endDate)) {
                    this.toastHandler('warning', 'Start date cannot be greater than end date.');
                    this.isLoading = false;
                    return;
                }

                this.url = `/SmReports/GetCreditMemo?startDate=${this.startDate}&endDate=${this.endDate}`;
                this.reportPath = this.reportPathConfig.summaryReportPath;
            }

            axios.get(this.url)
                .then(response => {

                    const header = response.data.reportHeader;
                    this.header = header;

                    let details = [];

                    if (this.isCanceled) {
                        details = response.data.reportDetails.data;
                    } else {
                        details = response.data.reportDetails;
                    }

                    this.reportDetails = details;

                    const filteredDetails = this.filterReport(details);

                    this.renderReport(header, filteredDetails, this.reportPath);

                    this.isLoading = false;

                    if (response.data.message) {
                        this.toastHandler('warning', response.data.message);
                    }
                })
                .catch(() => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                });
        },
        filterReport(details) {

            let filtered = [...details];

            if (this.classId) {
                filtered = filtered.filter(x => x.classId === this.classId);
            }

            return filtered;
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
   
    async mounted() {
        await Promise.all([
            this.loadClassData(),
            this.getAcademicYears(),
            this.getTerms()
        ]);
        this.reportApiBaseUrl = reportApiBaseUrl;
    }
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');