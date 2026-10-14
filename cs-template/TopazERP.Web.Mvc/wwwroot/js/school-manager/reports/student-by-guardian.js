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
            allGuardians: [],
            legalGuardians: [],
            legalGuardianId: "",
            titles: [],
            relationships: [],
            byStudent: false,
            byGuardian: false,
            assignedGuardians: [],
            reportTitle: 'Students Guardian Details',
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770642770/erp-reports/school-manager/guardians-detail_cplmuy_e3nzvm.rdl',
        }
        },
    mounted() {
        this.loadData();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods: {
    toggleByStudent(){
        this.byStudent = true;
        this.byGuardian = false;
    },
        toggleByGuardian(){
        this.byStudent = false;
        this.byGuardian = true;
        },
    
        loadData() {
            axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmStudentSetups/ListAllStContactRelationship'),
                axios.get('/jsonDataSample/relationships.json'),
                axios.get('/jsonDataSample/titles.json')
            ]).then(axios.spread((classes, mainClasses, streams, students, header, guardians, relationships, titles) => {
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.allStudents = students.data;
                this.allStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.allStudents.forEach(s => s.name = this.formatStudentName(s));
                this.allGuardians = guardians.data;
                this.allGuardians.forEach(g => g.name = this.formatLegalGuardianName(g));
                this.legalGuardians = guardians.data.filter(g =>g.isLegalGuardian);
                this.legalGuardians.forEach(g => g.name = this.formatLegalGuardianName(g));
                const uniqueGuardiansMap = new Map();
                this.legalGuardians.forEach(g => {
                    if (!uniqueGuardiansMap.has(g.legalGuardiaanId)) {
                        uniqueGuardiansMap.set(g.legalGuardiaanId, {
                            ...g,
                            name: this.formatLegalGuardianName(g)
                        });
                    }
                });
                this.assignedGuardians = Array.from(uniqueGuardiansMap.values());

                this.assignedGuardians.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.header = header.data;
                this.relationships = relationships.data;
                this.titles = titles.data;
                this.initDropdowns();
            }));
        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        formatLegalGuardianName(guardian) {
            return [guardian.lastName, guardian.firstName, guardian.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        getRelationshipName(relationshipId) {
            return this.relationships.find(r => r.id === relationshipId)?.name || '';
        },
        getTitleName(titleId) {
            return this.titles.find(t => t.id === titleId)?.name || '';
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        searchReport() {
            let reportData = [];
            let title = 'Students Guardian Details';

            // 1️⃣ Filter by student
            if (this.byStudent && this.studentId) {
                this.byStudent = true;
                this.reportPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770643635/erp-reports/school-manager/student-guardians_gzhm8z_b6kbq8.rdl';
                const student = this.allStudents.find(s => s.id === this.studentId);
                if (!student) return;
                const guardians = this.allGuardians.filter(g => g.studentId === this.studentId);
                reportData = guardians.map(g => ({
                    StudentId: student.studentIdentifier,
                    StudentName: this.formatStudentName(student),
                    GuardianId: g.legalGuardiaanId,
                    GuardianName: this.formatLegalGuardianName(g),
                    Relationship: this.getRelationshipName(g.relationshipId),
                    TitleName: this.getTitleName(g.titleId),
                    PhoneNumber: g.phoneNumber,
                    Email: g.email,
                    PlaceOfWork: g.placeOfWork,
                    WorkPhone: g.workPhone,
                    IsLegalGuardian: g.isLegalGuardian,
                    Title: `Guardians for ${this.formatStudentName(student)}`,
                }));
               
            }
            // 2️⃣ Filter by legal guardian
            else if (this.byGuardian && this.legalGuardianId) {
                this.byGuardian = true;
                this.reportPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770643461/erp-reports/school-manager/studentsList_nqrqj9_skegqj.rdl';
                const guardian = this.allGuardians.find(g => g.legalGuardiaanId === this.legalGuardianId && g.isLegalGuardian === true);
                if (!guardian) return;

                // Get students under this guardian
                const students = this.allStudents.filter(s =>
                    this.allGuardians.some(g => g.studentId === s.id && g.legalGuardiaanId === this.legalGuardianId)
                );

                const title = `Students under ${this.formatLegalGuardianName(guardian)}`;

                reportData = students.map(s => {
                    const studentClass = this.classes.find(c => String(c.id) === String(s.classId)) || {};
                    const className = `${this.getMainClassName(studentClass.classId)} ${this.getStreamName(studentClass.streamId)}`.trim();

                    return {
                        StudentIdentifier: s.studentIdentifier,
                        StudentName: this.formatStudentName(s),
                        PhoneNumber: s.phoneNumber,
                        ClassName: className || '',  
                        DateOfBirth: this.normalizeDate(s.dateOfBirth),
                        Gender: s.gender,
                        Title: title
                    };
                });
            }

            // 3️⃣ If nothing selected, show all student-guardian mappings
            else {
                this.reportPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770642770/erp-reports/school-manager/guardians-detail_cplmuy_e3nzvm.rdl',
                reportData = this.allGuardians.map(g => {
                    const student = this.allStudents.find(s => s.id === g.studentId);
                    return {
                        StudentId: student?.studentIdentifier,
                        StudentName: student ? this.formatStudentName(student) : '',
                        GuardianId: g.legalGuardiaanId,
                        GuardianName: this.formatLegalGuardianName(g),
                        Relationship: this.getRelationshipName(g.relationshipId),
                        TitleName: this.getTitleName(g.titleId),
                        PhoneNumber: g.phoneNumber,
                        Email: g.email,
                        PlaceOfWork: g.placeOfWork,
                        WorkPhone: g.workPhone,
                        IsLegalGuardian: g.isLegalGuardian,
                        Title: title
                    };
                });
            }

            this.reportTitle = title;

            // Render the report
            this.renderReport(this.header, reportData, this.reportPath);
        },

        
            initDropdowns() {
                $('#studentId').ejDropDownList({
                    dataSource: this.allStudents,
                    width: "100%",
                    watermarkText: "Select Student...",
                    enableFilterSearch: true,
                    fields: { id: "id", text: "name", value: "id" },
                    change: args => {
                        this.studentId = args.value;

                        // Clear guardian selection when student is selected
                        this.legalGuardianId = "";
                        $("#legalGuardianId").data("ejDropDownList").option("value", "");

                        this.byStudent = !!this.studentId;
                        this.byGuardian = false;

                        this.searchReport();
                    }
                });

                $('#legalGuardianId').ejDropDownList({
                    dataSource: this.assignedGuardians,
                    width: "100%",
                    watermarkText: "Select Legal Guardian...",
                    enableFilterSearch: true,
                    fields: { id: "id", text: "name", value: "legalGuardiaanId" },
                    change: args => {
                        this.legalGuardianId = args.value;

                        // Clear student selection when guardian is selected
                        this.studentId = "";
                        $("#studentId").data("ejDropDownList").option("value", "");

                        this.byStudent = false;
                        this.byGuardian = !!this.legalGuardianId;

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