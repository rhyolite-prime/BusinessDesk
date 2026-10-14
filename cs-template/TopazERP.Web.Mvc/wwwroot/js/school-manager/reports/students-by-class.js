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
            statusFilter: ['Active'],
            reportTitle: 'Student List',
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770643461/erp-reports/school-manager/studentsList_nqrqj9_skegqj.rdl',
        }
        },
    mounted() {
        this.loadData();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods: {
        loadData() {
            axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmStudentSetups/ListAllStudentStatuses'),
                axios.get('/SmDataEntry/GetAllAssignedSubjects/')
            ]).then(axios.spread((classes, mainClasses, streams, students, header, status) => {

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.statuses = status.data;
                
                

                // ✅ assign allStudents first
                this.allStudents = students.data.filter(s => !s.isPreClassStudent);
                this.allStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.students = [...this.allStudents];

                this.header = header.data;
                

                this.initDropdowns();
            }));
        },
        isStudentActive(student) {
            const status = this.statuses.find(
                s => s.id === student.statusId
            );

            if (!status || !status.name) return false;

            return status.name.toLowerCase() === 'active';
        },

        matchesStatusFilter(student) {
            // No status filter selected → include all
            if (this.statusFilter.length === 0) return true;

            const isActive = this.isStudentActive(student);

            if (this.statusFilter.includes('Active') && isActive) return true;
            if (this.statusFilter.includes('Inactive') && !isActive) return true;
            return false;
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        searchReport() {
            if (!this.classId) {
                this.toastHandler('warning', 'Please select a class');
                return;
            }

            const classInfo = this.classes.find(c => String(c.id) === String(this.classId)) || {};

            const className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
            let title = 'Student List';

            if (
                this.statusFilter.length === 1 &&
                this.statusFilter.includes('Active')
            ) {
                title = 'Active Student List';
            } else if (
                this.statusFilter.length === 1 &&
                this.statusFilter.includes('Inactive')
            ) {
                title = 'Inactive Student List';
            }

            const reportStudents = this.allStudents
                .filter(s => String(s.classId) === String(this.classId))
                .filter(s => {
                    if (this.genderFilter.length === 0) return true;
                    return this.genderFilter.includes(s.gender);
                })
                .filter(s => this.matchesStatusFilter(s)) 
                .map(s => ({
                    ClassName: className,
                    StudentName: this.formatStudentName(s),
                    StudentIdentifier: s.studentIdentifier,
                    DateOfBirth: this.normalizeDate(s.dateOfBirth),
                    PhoneNumber: s.phoneNumber,
                    Gender: s.gender,
                    Title: title
                }));



            if (!reportStudents.length) {
                this.toastHandler('warning', 'No students found for this class');
                return;
            }
            console.log(reportStudents);

            this.renderReport(this.header, reportStudents, this.reportPath);
        },
        
        initDropdowns() {
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id, 
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            $('#classId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.classId = args.value;
                    this.searchReport();
                }
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