const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            allStudents: [],
            students: [],
            classId: null,
            classes: [],
            mainClasses: [],
            streams: [],
            reportApiBaseUrl: '',
            reportHeader: [],
            genderFilter: [],
            statuses: [],
            reportTitle: 'Alumni List',
            checkBalance: false,
            academicYears: [],
            academicYearId: null,
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770643805/erp-reports/school-manager/alumni_jbzkuy_xsjlto.rdl',
        }
        },
    mounted() {
        this.loadData();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods: {
        toggleCheckBalance() {
            if (this.checkBalance) {
                this.reportPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770643804/erp-reports/school-manager/alumni-balance_kpqjrb_wyeotq.rdl';
            } else {
                this.reportPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770643805/erp-reports/school-manager/alumni_jbzkuy_xsjlto.rdl';
            }

            this.searchReport();
        },


        loadData() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears/'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmStudentSetups/ListAllStudentStatuses'),
                axios.get('/SmDataEntry/GetAllAssignedSubjects/')
            ]).then(axios.spread((years, classes, mainClasses, streams, students, header, status) => {

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.statuses = status.data;
                this.academicYears = years.data;



                // ✅ assign allStudents first
                this.allStudents = students.data.filter(s => s.isAlumni);
                this.allStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.students = [...this.allStudents];

                this.header = header.data;


                this.initDropdowns();
            }));
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        searchReport() {
            
            const AcademicYearName = this.academicYears.find(y => y.id === this.academicYearId)?.name;
            
            
            let title = 'Alumni List For The Year ' + AcademicYearName;
            
            if (this.checkBalance) title = 'Alumni Balance List For The Year ' + AcademicYearName;
            

            const reportStudents = this.allStudents
                .filter(s => s.academicYearId === this.academicYearId)
                .filter(s => {
                    if (this.genderFilter.length === 0) return true;
                    return this.genderFilter.includes(s.gender);
                })
                .map(s => ({
                    StudentName: this.formatStudentName(s),
                    StudentIdentifier: s.studentIdentifier,
                    DateOfBirth: this.normalizeDate(s.dateOfBirth),
                    PhoneNumber: s.phoneNumber,
                    Gender: s.gender,
                    Title: title,
                    Balance: s.balanceDue
                }));

            if (!reportStudents.length) {
                this.toastHandler('warning', 'No students found in Alumni');
                return;
            }
            console.log(reportStudents);

            this.renderReport(this.header, reportStudents, this.reportPath);
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
                this.searchReport();
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
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        normalizeDate(date) {
            if (!date) return null;
            return new Date(date).toISOString().split('T')[0];
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
});
app.mount('#app');