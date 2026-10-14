const app = Vue.createApp({
    data() {
        return {
            assignments: [],
            flatAssignments: [],
            isLoading: false,
            schClasses: [],
            academicYearId: '',
            termId: '',
            classId: '',
            uploadFile: null,
            academicYears: [],
            classes: [],
            subjects: [],
            academicYearName: '',
            termName: '',
            className: '',
            subjectId: '',
            subjectName: '',
            assignmentNumber: 1,
            overallMark: 0,
            assignmentDate: '',
            assignmentNo: '',
            mainClasses: [],
            streams: [],
            terms: [],
            tableData: [],
            allAssignments: [],
            reportTitle: '',
            header: [],
            teachers: [],
            teacherClasses: [],
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770642770/erp-reports/school-manager/staffs-all_xi5pfb_amu5j2.rdl',
            staffs: [],
            nonTeachers: [],
            isTeacher: false,
            isNonTeacher: false,
            teacherFilter: [],
            filterByClass: false,
            all: true,
            designations: []
        }
    },
    mounted() {
        this.loadDropdowns();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods: {
    
        onFilterChange() {
            if (this.isTeacher) this.isNonTeacher = false;
            if (this.isNonTeacher) this.isTeacher = false;
            this.searchReport();
        },
        toggleIsTeacher() {
            this.isTeacher = true;
            this.isNonTeacher = false;
            this.all = false;
            this.searchReport();
        },
        toggleIsNonTeacher() {
            this.isNonTeacher = true;
            this.isTeacher = false;
            this.all = false;
            this.searchReport();
        },
        toggleAll() {
            this.isNonTeacher = false;
            this.isTeacher = false;
            this.all = true;
            this.searchReport();
        },
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllTerms/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmDataEntry/GetAllRegisteredClasses/'),
                axios.get('/SmStaffSetups/ListAllStaffBios/'),
                axios.get('/SmStaffSetups/ListAllStaffDesignations/'),

            ]).then(axios.spread((years, classes, terms, mainClasses, streams, header, teacherClasses, staffs, designations) => {

                this.academicYears = years.data;

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.header = header.data;
                this.terms = terms.data;
                this.staffs = staffs.data;
                this.staffs.forEach(t => {
                    t.fullName = `${t.lastName} ${t.firstName} ${t.otherName ? t.otherName : ''}`
                })
                this.staffs.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.teachers = this.staffs.filter(s => s.isTeacher);
                this.nonTeachers = this.staffs.filter(s => !s.isTeacher);
                this.teacherClasses = teacherClasses.data;
                this.designations = designations.data;
                this.initDropdowns();
            }));
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getTeachersByClass(classId) {
            const regClass = this.teacherClasses
                .find(c => String(c.classId) === String(classId));

            if (!regClass) return [];

            return [
                regClass.mainTeacherId,
                regClass.subTeacherId
            ].filter(Boolean);
        },

        initDropdowns() {
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id, // levelClassId
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
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
        searchReport() {

            let reportRows = [];
            let title = '';
            let path = '';

            // Get active academic year
            const activeYear = this.academicYears.find(y => y.isActive === true);
            this.academicYearId = activeYear ? activeYear.id : null;

            // Resolve class name once if selected
            let className = '';
            if (this.classId) {
                const classInfo = this.classes.find(c => String(c.id) === String(this.classId)) || {};
                className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
            }
            
           

            // =========================
            // 1. NON-TEACHING STAFF
            // =========================
            if (this.isNonTeacher && !this.all) {

                title = 'Non-Teaching Staff Report';
                path = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770642770/erp-reports/school-manager/staffs-all_xi5pfb_amu5j2.rdl';
                reportRows = this.staffs
                    .filter(s => !s.isTeacher)
                    .filter(s => s.academicYearId === this.academicYearId) // ✅ filter by active year
                    .map(s => ({
                        StaffIdentifier: s.staffIdentifier,
                        StaffName: s.fullName,
                        PhoneNumber: s.contactNumber,
                        Designation:  this.designations.find(d => d.id === s.designationId)?.name || '',
                        ClassName: '',
                        Title: title,
                        isMainTeacher: false,
                        isSubTeacher: false
                    }));
            }

                // =========================
                // 2. TEACHERS
            // =========================
            else if (this.isTeacher && !this.all) {

                // -------- BY CLASS --------
                if (this.classId) {

                    const regClass = this.teacherClasses
                        .find(c => String(c.classId) === String(this.classId) && c.academicYearId === this.academicYearId);
                   
                    if (!regClass) return;

                    title = `Teaching Staff – ${className}`;
                    path = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770643353/erp-reports/school-manager/teacher-by-class_kyuf59_m8q9wr.rdl';

                    reportRows = this.teacherClasses
                        .filter(s =>
                            s.academicYearId === this.academicYearId && s.classId === this.classId
                        )
                        .map(s => ({
                            MainClassTeacher: this.staffs.find(t => t.id === s.mainTeacherId)?.fullName || '',
                            SubClassTeacher: this.staffs.find(t => t.id === s.subTeacherId)?.fullName || '',
                            Title: title,
                            isMainTeacher: true,
                            isSubTeacher: true
                        }));
                }

                // -------- ALL TEACHERS --------
                else {

                    title = 'List Of Teaching Staff';
                    path = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770643353/erp-reports/school-manager/staff-teaching_rotk8e_fbgkmy.rdl';

                    reportRows = this.staffs
                        .filter(s => s.isTeacher && s.academicYearId === this.academicYearId) // ✅ filter by active year
                        .map(s => {

                            // Find all classes in the active year where this teacher is main or assistant
                            const staffClasses = this.teacherClasses.filter(tc =>
                                tc.academicYearId === this.academicYearId &&
                                (tc.mainTeacherId === s.id || tc.subTeacherId === s.id)
                            );

                            // Resolve class names
                            const classNames = staffClasses.map(tc => {
                                const classInfo = this.classes.find(c => String(c.id) === String(tc.classId)) || {};
                                return `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
                            });

                            return {
                                StaffIdentifier: s.staffIdentifier,
                                StaffName: s.fullName,
                                PhoneNumber: s.contactNumber,
                                Designation: this.designations.find(d => d.id === s.designationId)?.name || '',
                                ClassName: classNames.join(', '),
                                Title: title,
                                isMainTeacher: false,
                                isSubTeacher: false
                            };
                        });
                }
            }

                // =========================
                // 3. ALL STAFF
            // =========================
            else {
                this.all = true;
                title = 'All Staffs List';
                path = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770642770/erp-reports/school-manager/staffs-all_xi5pfb_amu5j2.rdl';

                reportRows = this.staffs
                    .filter(s => s.academicYearId === this.academicYearId) // ✅ filter by active year
                    .map(s => ({
                        StaffIdentifier: s.staffIdentifier,
                        StaffName: s.fullName,
                        PhoneNumber: s.contactNumber,
                        Designation: this.designations.find(d => d.id === s.designationId)?.name || '',
                        ClassName: '',
                        Title: title,
                        isMainTeacher: false,
                        isSubTeacher: false
                    }));
            }

            // Set report meta
            this.reportTitle = title;
            this.reportPath = path;

            this.renderReport(this.header, reportRows, path);
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