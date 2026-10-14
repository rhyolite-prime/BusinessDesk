const app = Vue.createApp({
    data() {
        return {
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            students: [],
            classStudents: [],
            academicYearId: '',
            classId: '',
            termId: '',
            studentId: '',
            pdfUrl: null,
            activeTab: 'view',
            selectedStudents: [],
            selectAll: false,
            isSendingEmails: false,
            emailResultModalVisible: false,
            emailResultMessage: '',
            skippedStudents: [],
            page: 1,
            perPage: 10
        }
    },
    mounted() {
        this.loadDropdowns();
    },
    computed: {
        paginatedRows() {
            const start = (this.page - 1) * this.perPage;
            return this.classStudents.slice(start, start + this.perPage);
        },

        totalPages() {
            return Math.ceil(this.classStudents.length / this.perPage) || 1;
        }
    },
    methods: {
        selectStudent(student) {
            this.studentId = student.id;
            this.printReport();
        },
        toggleSelectAll() {
            if (this.selectAll) {
                this.selectedStudents = this.classStudents.map(s => s.id);
            } else {
                this.selectedStudents = [];
            }
        },
        emailSelectedStudents() {
            if (!this.selectedStudents.length) {
                this.toastHandler('warning', 'Please select at least one student.');
                return;
            }

            if (!this.academicYearId || !this.termId || !this.classId) {
                this.toastHandler('warning', 'Select Academic Year, Term and Class.');
                return;
            }

            this.isSendingEmails = true; // show loader
            this.emailResultModalVisible = false; // hide modal initially

            axios.post('/SmReports/EmailMidTermReportPdf', {
                studentIds: this.selectedStudents,
                classId: this.classId,
                academicYearId: this.academicYearId,
                termId: this.termId
            })
                .then((res) => {
                    this.emailResultMessage = res.data.message || 'Emails process completed.';
                    this.skippedStudents = res.data.skipped || [];
                    this.emailResultModalVisible = true; // show modal
                    if (res.data.code === 200) {
                        this.selectedStudents = [];
                        this.selectAll = false;
                    }
                })
                .catch(() => {
                    this.emailResultMessage = 'Error sending emails. Please try again.';
                    this.emailResultModalVisible = true; // show modal
                })
                .finally(() => {
                    this.isSendingEmails = false; // hide loader
                });
        },



        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),

            ]).then(axios.spread((years, classes, terms, mainClasses, streams, students) => {

                this.academicYears = years.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;

                this.terms = terms.data;
                this.students = students.data.filter(s => !s.isAlumni);
                this.students.forEach(s => {
                    s.name = this.formatStudentName(s);
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.initDropdowns();
            }));
        },
       /* getClassStudents(classId) {
            this.classStudents = this.students
                .filter(s => s.classId === classId)
                .sort((a, b) => a.lastName.localeCompare(b.lastName));

            this.studentId = null;
            this.pdfUrl = null;
            this.selectedStudents = [];
            this.selectAll = false;
        },*/
        getClassStudents(classId) {
            this.classStudents = this.students.filter(s => s.classId === classId);
            this.classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
            $('#studentId').ejDropDownList({
                dataSource: this.classStudents,
                width: "100%",
                watermarkText: "Select Student...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.studentId = args.value;
                    this.printReport();
                }
            });
            return this.classStudents;

        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getLevelName(levelId) {
            return this.allLevels.find(c => c.id === levelId)?.levelName || '';
        },
        /* getClassStudents(classId) {
             this.classStudents = this.students.filter(s => s.classId === classId);
             this.classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
             return this.classStudents;
 
         },*/
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
                    this.getClassStudents(args.value);
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
                }
            });
            $('#studentId').ejDropDownList({
                dataSource: this.students,
                width: "100%",
                watermarkText: "Select Student...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.studentId = args.value;
                    this.printReport();
                }
            });
        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },



        printReport() {

            if (!this.academicYearId || !this.termId || !this.classId) {
                this.toastHandler('warning', 'Please select all required fields.');
                return;
            }

            axios.get('/SmReports/DownloadMidTermPdf', {
                params: {
                    studentId: this.studentId,
                    classId: this.classId,
                    academicYearId: this.academicYearId,
                    termId: this.termId
                },
                responseType: 'blob'
            })
                .then(response => {

                    if (!response.data) {
                        this.toastHandler('error', 'Could not generate report.');
                        return;
                    }

                    const blob = new Blob([response.data], {
                        type: 'application/pdf'
                    });

                    if (this.pdfUrl) {
                        URL.revokeObjectURL(this.pdfUrl);
                    }
                    this.pdfUrl = URL.createObjectURL(blob);


                })
                .catch(error => {
                    console.error('Error generating report:', error);
                    this.toastHandler('error', 'Error generating report.');
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