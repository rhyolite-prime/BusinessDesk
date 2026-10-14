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
            assessmentType: 'Interest',
            academicYears: [],
            classes: [],
            academicYearName: '',
            termName: '',
            className: '',
            mainClasses: [],
            streams: [],
            terms: [],
            allAssessments: [],
            assessmentExists: false,
            existingAssessmentMessage: '',
            lockInputs: false,
            tableData: [],
            assessmentId: [],
            students: [],
            page: 1,
            perPage: 10,
            studentStatus: []
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
        this.loadAllAssessments();
    },
    methods: {
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
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents'),
            ]).then(axios.spread((years, classes, terms, mainClasses, streams, students) => {

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
            this.assignmentDate = new Date().toISOString().substr(0, 10);

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
                    if (!this.assessmentExists) {
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
                    if (!this.assessmentExists) {
                        this.loadTableData();
                    }
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
                    this.findExisting();
                    if (!this.assessmentExists) {
                        this.loadTableData();
                    }
                }
            });

        },
        loadAllAssessments() {
            axios.get('/SmResultsPromotions/GetAllAssessments/', {
                params: { assessmentType: this.assessmentType }
            }).then(res => {
                this.allAssessments = res.data || [];
                this.findExisting();
                this.allAssessments.forEach(a => {
                    this.tenantId = a.tenantId;
                    this.assessmentId = a.id;
                })
            });
        },
        findExisting() {

            if (!this.academicYearId || !this.termId || !this.classId) {
                return;
            }

            const found = this.allAssessments.filter(a =>
                a.academicYearId === this.academicYearId &&
                a.termId === this.termId &&
                a.classId === this.classId &&
                a.assessmentType === this.assessmentType
            );


            if (found.length) {
                const existing = found[0];
                const assessment = this.allAssessments.find(a => a.id === existing.id);
                this.assessmentId = existing.id;
                this.assessmentExists = true;
                this.existingAssessmentMessage =
                    'Attitude Assessments for the selected Academic Year, Term, and Class already exist.' +
                    'This data can be updated or you can choose different criteria to create new assessments.';

                const classStudents = this.students.filter(
                    s => s.classId === this.classId
                );

                const detailsMap = {}
                assessment.assessments.forEach(d => {
                    detailsMap[d.studentIdentifier] = d;
                });

                this.tableData = classStudents.map(s => {
                    const detail = detailsMap[s.studentIdentifier];

                    return {
                        id: detail?.id || this.uuid(),
                        studentId: s.id,
                        studentIdentifier: s.studentIdentifier,
                        studentName: [s.lastName, s.firstName, s.otherName]
                            .filter(n => n && n.trim() !== '')
                            .join(' '),
                        description: detail ? detail.description : ''
                    };
                });

            } else {
                this.assessmentId = '';
                this.assessmentExists = false;
                this.existingAssessmentMessage = '';
                this.tableData = [];
            }
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
                id: this.uuid(),
                studentId: s.id,
                studentIdentifier: s.studentIdentifier,
                studentName: [s.lastName, s.firstName, s.otherName]
                    .filter(n => n && n.trim() !== '')
                    .join(' '),
                description: ""
            }));
        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        saveAssessment() {

            if (!this.tableData.length) {
                this.toastHandler('warning', 'No assessment records to save.');
                return;
            }

            this.isLoading = true;
            this.lockInputs = true;

            const assessments = this.tableData.map(x => ({
                id: x.id || null,
                studentId: x.studentId,
                studentIdentifier: x.studentIdentifier,
                studentName: x.studentName,
                description: x.description
            }));

            // ===== CREATE =====
            if (!this.assessmentExists) {

                const payload = {
                    classId: this.classId,
                    className: this.className,
                    academicYearId: this.academicYearId,
                    academicYearName: this.academicYearName,
                    termId: this.termId,
                    termName: this.termName,
                    assessmentType: this.assessmentType,
                    assessments: assessments
                };

                axios.post('/SmResultsPromotions/CreateAssessment', payload)
                    .then(res => {
                        this.toastHandler('success', 'Assessment saved successfully.');
                        this.loadAllAssessments();
                    })
                    .catch(err => {
                        this.toastHandler(
                            'error',
                            err.response?.data?.message || 'Failed to save assessment.'
                        );
                        this.lockInputs = false;
                    })
                    .finally(() => {
                        this.isLoading = false;
                    });

                return;
            }

            // ===== UPDATE =====
            const updatePayload = {
                id: this.assessmentId,
                classId: this.classId,
                className: this.className,
                academicYearId: this.academicYearId,
                academicYearName: this.academicYearName,
                termId: this.termId,
                termName: this.termName,
                assessmentType: this.assessmentType,
                tenantId: this.tenantId,
                assessments: assessments
            };

            axios.post('/SmResultsPromotions/UpdateAssessment', updatePayload)
                .then(() => {
                    this.toastHandler('success', 'Assessment updated successfully.');
                    this.loadAllAssessments();
                })
                .catch(err => {
                    this.toastHandler(
                        'error',
                        err.response?.data?.message || 'Failed to update assessment.'
                    );
                    this.lockInputs = false;
                })
                .finally(() => {
                    this.isLoading = false;
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