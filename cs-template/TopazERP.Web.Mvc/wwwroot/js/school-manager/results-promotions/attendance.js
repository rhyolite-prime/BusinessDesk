const app = Vue.createApp({
    data() {
        return {
            file: null,
            previewRows: [],
            loading: false,
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            schClasses: [],
            academicYearId: '',
            termId: '',
            classId: '',
            uploadFile: null,
            academicYears: [],
            classes: [],
            terms: [],
            mainClasses: [],
            streams: [],
            allAttendance: [],
            students: [],
            attendanceId: '',
            tableData: [],
            exists: false,
            message: '',
            lockInputs: false,
            tenantId: null,
            page: 1,
            perPage: 10,
            studentStatus: [],
        }
    },
    computed: {
        hasErrors() {
            return this.previewRows.some(r => r.error);
        },
        paginatedRows() {
            const start = (this.page - 1) * this.perPage;
            return this.tableData.slice(start, start + this.perPage);
        },

        totalPages() {
            return Math.ceil(this.tableData.length / this.perPage) || 1;
        }
    },

    mounted() {
        this.getStudentStatus();
        this.loadDropdowns();
        this.loadAttendance();
    },
    methods: {
        loadAttendance() {
            axios.get(`/SmResultsPromotions/GetAllAttendance/`)
                .then(res => {
                    this.allAttendance = res.data;
                    
                    // map tenantid for each record
                    this.allAttendance.forEach(a => {
                        this.tenantId = a.tenantId;
                    });
                    this.findExisting();
                   
                });
        },
        getStudentStatus() {
            return axios.get(`/jsonDataSample/studentStatuses.json?v=${new Date().getTime()}`)
                .then(res => {
                    this.studentStatus = res.data;
                });
        },
        
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/jsonDataSample/terms.json'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
            ]).then(axios.spread((
                years, classes, mainClasses, streams, terms, students
            ) => {
                this.academicYears = years.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.terms = terms.data;
                const activeStatusIds = this.studentStatus
                    .filter(status => status.isActive === true)
                    .map(status => status.id);

                // Only keep students with an active status
                this.students = students.data.filter(student =>
                    activeStatusIds.includes(student.statusId)
                );

                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName || ''}`.trim();
                    s.displayText = `${s.studentIdentifier} - ${s.name}`;
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.initDropdowns();
            }));
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        /* ===========================
           INIT EJ DROPDOWNS
        ============================ */
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
                    this.findExisting();
                    if (!this.exists) {
                        this.loadTableData();
                    }
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
                    this.findExisting();
                    if (!this.exists) {
                        this.loadTableData();
                    }
                }
            });
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select Term...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.termId = args.value;
                    this.findExisting();
                    if (!this.exists) {
                        this.loadTableData();
                    }
                }
            });

        },
        findExisting() {
            if (!this.academicYearId || !this.termId || !this.classId) return;

            const existing = this.allAttendance.filter(a =>
                a.academicYearId === this.academicYearId &&
                a.termId === this.termId &&
                a.classId === this.classId
            );

            if (!existing.length) {
                this.exists = false;
                this.tableData = [];
                return;
            }

            this.exists = true;

            const attendanceMap = {};
            existing.forEach(a => {
                attendanceMap[a.studentId] = a;
            });

            const classStudents = this.students.filter(s => s.classId === this.classId);
            this.tableData = classStudents.map(s => {
                const row = attendanceMap[s.id];
                return {
                    id: row?.id || '',
                    studentId: s.id,
                    studentName: [s.lastName, s.firstName, s.otherName]
                        .filter(Boolean)
                        .join(' '),
                    days: row?.days || null,
                    academicYearId: this.academicYearId,
                    termId: this.termId,
                    classId: this.classId,
                    tenantId: this.tenantId,
                };
            });
        },

        loadTableData() {
            if (!this.classId || !this.termId || !this.academicYearId) {
                this.tableData = [];
                return;
            }

            const classStudents = this.students.filter(
                s => s.classId === this.classId
            );

            this.tableData = classStudents.map(s => ({
                academicYearId: this.academicYearId,
                termId: this.termId,
                classId: this.classId,
                studentId: s.id,
                studentName: [s.lastName, s.firstName, s.otherName]
                    .filter(n => n && n.trim() !== '')
                    .join(' '),
                days: null,
            }));

        },
        saveAttendance() {
          if (!this.tableData.length) {
                this.toastHandler('warning', 'No student data to save.');
                return;
            }
          
          this.isLoading = true;
          
            const requests = this.tableData.map(row => {
              

                if (row.id) {
                    const updatePayload = {
                        Id: row.id,
                        AcademicYearId: this.academicYearId,
                        TermId: this.termId,
                        ClassId: this.classId,
                        StudentId: row.studentId,
                        Days: parseInt(row.days) || 0,
                        TenantId: this.tenantId
                    };
                    return axios.post('/SmResultsPromotions/UpdateAttendance', updatePayload);
                } else {
                    const createPayload = {
                        AcademicYearId: this.academicYearId,
                        TermId: this.termId,
                        ClassId: this.classId,
                        StudentId: row.studentId,
                        Days: parseInt(row.days) || 0,
                    };
                    return axios.post('/SmResultsPromotions/CreateAttendance', createPayload);
                }
            });
            Promise.all(requests)
                .then(() => {
                    this.loadAttendance();
                    this.isLoading = false;
                    this.toastHandler('success', 'Attendance saved successfully!');
                })
                .catch(err => {
                    this.isLoading = false;
                    this.toastHandler('error', 'Failed to save attendance data.');
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

});
app.mount('#app');