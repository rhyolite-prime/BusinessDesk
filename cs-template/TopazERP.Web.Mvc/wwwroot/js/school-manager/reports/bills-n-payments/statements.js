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
            studentList: [],
            studentId: '',
            classList: [],
            classId: '',
            mainClasses: [],
            streams: [],
            classes: [],
            levelClasses: [],
            students:[],
            reports:[],
            page: 1,
            pageSize: 10,
            studentIds:[],
            selectedData: 0,
            search: "",
            viewMultiple: true,
            reportHeader: null,
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1783528554/erp-reports/school-manager/student-statement_logo_jfecfv.rdl',
            },
        }
    },
    computed:{

        filteredData(){

            if(!this.search)
                return this.reports;

            const search = this.search.toLowerCase();

            return this.reports.filter(r => {

                const regNo = (r.regNo || '').toLowerCase();
                const studentName = (r.studentName || '').toLowerCase();

                return regNo.includes(search) ||
                    studentName.includes(search);

            });

        },

        totalPages(){

            return Math.max(1,Math.ceil(this.filteredData.length/this.pageSize));

        },

        pagedData(){

            const start=(this.page-1)*this.pageSize;

            return this.filteredData.slice(start,start+this.pageSize);

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
        async searchReport() {
            this.isLoading = true;

            //if start date is greater than end date, show error
            if (moment(this.startDate).isAfter(this.endDate)) {
                this.toastHandler('warning', 'Start date cannot be greater than end date.');
                this.isLoading = false;
                return;
            }

           
            if (!this.viewMultiple && !this.studentId) {
                this.toastHandler('warning', 'Please select a student.');
                this.isLoading = false;
                return;
            }
            if (this.viewMultiple) {

                const studentIds = this.studentList.map(x => x.id);

                if (!studentIds.length) {
                    this.toastHandler('warning', 'No students found.');
                    this.isLoading = false;
                    return;
                }

                try {

                    // ONE API CALL
                    const response = await axios.post('/SmReports/GetMultipleStatements',
                        {
                            studentIds: studentIds,
                            startDate: this.startDate,
                            endDate: this.endDate
                        });
                    // One report container per receipt

                    this.reportHeader = response.data.reportHeader;
                    this.reportHeader = response.data.reportHeader;

                    this.reports = response.data.reportDetails.map(x => {

                        const firstLine = x.lines[0];

                        return {
                            ...x,
                            studentName: firstLine?.studentName ?? '',
                            regNo: firstLine?.regNo ?? '',
                            className: firstLine?.className ?? '',
                            lines: x.lines
                        };

                    });

                    await this.$nextTick();

                    if (this.reports.length) {
                        this.showReport(this.reports[0]);
                    }

                } catch (err) {

                    console.error(err);

                    this.toastHandler(
                        'error',
                        'Unable to get statements.'
                    );
                }

                this.isLoading = false;
                return;
            }
            let url = `/SmReports/GetStatement?studentId=${this.studentId}&startDate=${this.startDate}&endDate=${this.endDate}`;
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

        showReport(report) {
            this.selectedData = report.lines[0]?.studentId;

            $("#reportView").empty();

            this.renderReport(
                this.reportHeader,
                report.lines,
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