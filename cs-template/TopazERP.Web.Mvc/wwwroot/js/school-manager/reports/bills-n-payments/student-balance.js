const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            reportType: 'type1',
            startDate: moment().format("YYYY-MM-DD"),
            reportApiBaseUrl: '',
            studentList: [],
            studentId: '',
            classList: [],
            classId: '',
            mainClasses: [],
            streams: [],
            classes: [],
            levelClasses: [],
            students:[],
            byClass: true,

            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1782994342/erp-reports/school-manager/studentBalance_lejvij.rdl',
            },
        }
    },
    methods: {
        getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/').then(response => {

                this.students = response.data.map(student => {
                    const name = [student.lastName, student.otherName, student.firstName]
                        .filter(x => x && x.trim())
                        .join(' ');

                    return {
                        ...student,
                        name,
                        displayText: `${student.studentIdentifier} - ${name}`
                    };
                });

                this.studentList = this.students;
            }).catch(err => {
                this.toastHandler('error', 'Unable to get students.');

            });

        },
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
        filterStudentsByClass() {
            const filtered = this.students.filter(s => s.classId === this.classId);
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            this.studentList = filtered;
            // Reset studentId when class changes
            this.studentId = null;
        },
        searchStudentReport() {
            this.isLoading = true;


            if (!this.studentId) {
                this.toastHandler('warning', 'Please select a student.');
                this.isLoading = false;
                return;
            }

            let url = `/SmReports/GetStudentBalance?studentId=${this.studentId}&startDate=${this.startDate}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;

            axios.get(url)
                .then(response => {
                    const header  = response.data.reportHeader;
                    const details = response.data.reportDetails.lines;
                    this.renderReport(header, details, this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                });
        },
        searchClassReport() {
            this.isLoading = true;
            this.byClass = true;

            if (!this.classId) {
                this.toastHandler('warning', 'Please select a class.');
                this.isLoading = false;
                return;
            }

            let url = `/SmReports/GetClassStudentBalance?classId=${this.classId}&startDate=${this.startDate}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;

            axios.get(url)
                .then(response => {
                    const header  = response.data.reportHeader;
                    const details = response.data.reportDetails.lines;
                    this.renderReport(header, details, this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get data');
                    this.isLoading = false;
                });
        },

        searchReport() {
            this.isLoading = true;
            if (this.byClass) {
                this.searchClassReport();
            } else {
                this.searchStudentReport();
            }
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
        classId: 'filterStudentsByClass',
    },
    async mounted() {
        await Promise.all([
            this.getStudents(),
            this.loadClassData()
        ]);

        this.reportApiBaseUrl = reportApiBaseUrl;
    }
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');