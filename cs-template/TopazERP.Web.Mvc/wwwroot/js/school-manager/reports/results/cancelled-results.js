const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            payload: {},
            reportApiBaseUrl: '',
            classList: [],
            reportHeader: [],
            reportData: [],
            reportDetails: [],
            mainClasses: [],
            streams: [],
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1772017321/erp-reports/school-manager/Cancelled-results_srivra.rdl',
        }
        },

    methods: {
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((years, classes, terms, header, mainClasses, streams) => {
                this.academicYears = years.data;
                this.classes = classes.data;
                this.terms = terms.data;
                this.reportHeader = header.data;
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
        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.academicYearId = args.value;
                    this.searchReport();
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.academicYearId = activeYear.id;
            }
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id, // levelClassId
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            $('#classId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select Source Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.classId = args.value;
                    this.searchReport();
                }
            });
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.termId = args.value;
                    this.searchReport();
                }
            });
           
        },
        searchReport() {
            if (!this.academicYearId || !this.termId) return;
            this.isLoading = true;
            axios.get('/SmReports/GetCanceledAssignments', {
                params: {
                    academicYearId: this.academicYearId,
                    termId: this.termId
                }
            }).then(res => {
                this.reportData = res.data || [];
                // format dates
                this.reportData.forEach(r => {
                    r.assignedDate = this.formatDate(r.assignedDate);
                    r.canceledDate = this.formatDate(r.canceledDate);
                })
                this.renderReport(this.reportHeader, this.reportData, this.reportPath);
            }).catch(() => {
                this.toastHandler('error', 'Failed to load canceled assignments.');
            }).finally(() => {
                this.isLoading = false;
            });
        },

        formatDate(dateInput) {
            return moment(dateInput).format("YYYY-MM-DD");
        },
        renderReport(header, details, reportPath) {
            console.log(details);

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
                dataSources: [{
                    value: header,
                    name: "DataSet1"
                },
                    {
                        value: details,
                        name: "DataSet2"
                    }]

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
    mounted() {
        this.loadDropdowns();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');