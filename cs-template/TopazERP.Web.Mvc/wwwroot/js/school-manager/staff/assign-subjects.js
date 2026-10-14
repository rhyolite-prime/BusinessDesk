const app = Vue.createApp({
    data() {
        return {
            teachers: [],
            classes: [],
            subjects: [],
            academicYears: [],
            teacherSubjects: [],
            selectedTeacher: null,
            selectedClass: null,
            selectedSubject: null,
            selectedAcademicYear: null,
            currentPage: 1,
            perPage: 5,
            searchQuery: '',
            classSubjects: [],
            teacherId: null,
            classId: null,
            subjectId: null,
            academicYearId: null,
            
        }
    },
    computed: {
        filteredSubjects() {
            if (!this.selectedClass || !this.selectedAcademicYear) return [];

            // find matching class + academic year
            const record = this.classSubjects.find(cs =>
                cs.classId === this.selectedClass.id &&
                cs.academicYearId === this.selectedAcademicYear.id
            );

            if (!record || !record.details) return [];

            // map to real subjects using subjectId
            return record.details.map(d => {
                return this.subjects.find(s => s.id === d.subjectId);
            }).filter(Boolean); // remove nulls
        },
        groupedTeacherSubjects() {
            const grouped = {};
            this.teacherSubjects.forEach(ts => {
                if (!grouped[ts.staffId]) {
                    grouped[ts.staffId] = { staffId: ts.staffId, staffName: ts.staffName, subjects: [] };
                }
                grouped[ts.staffId].subjects.push(ts);
            });

            let result = Object.values(grouped);

            // Filter by selected teacher
            if (this.selectedTeacher) {
                result = result.filter(t => t.staffId === this.selectedTeacher.id);
            }

            // Filter by search query
            if (this.searchQuery.trim() !== '') {
                const q = this.searchQuery.toLowerCase();
                result = result.map(t => {
                    const filteredSubjects = t.subjects.filter(s =>
                        s.subjectName.toLowerCase().includes(q) ||
                        s.className.toLowerCase().includes(q) ||
                        t.staffName.toLowerCase().includes(q) ||
                        s.academicYearName.toLowerCase().includes(q)
                    );
                    return { ...t, subjects: filteredSubjects };
                }).filter(t => t.subjects.length > 0 || t.staffName.toLowerCase().includes(q));
            }

            return result;
        },

        paginatedTeacherSubjects() {
            const start = (this.currentPage - 1) * this.perPage;
            const end = start + this.perPage;
            return this.groupedTeacherSubjects.slice(start, end);
        },

        totalPages() {
            return Math.ceil(this.groupedTeacherSubjects.length / this.perPage);
        }
    },


    methods: {
        loadLookups() {
            axios.all([
                axios.get('/SmStaffSetups/ListAllStaffBios'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllSubjects'),
                axios.get('/SmDataEntry/GetAllAssignedSubjects/')
            ]).then(axios.spread((
                teachers,
                levelClasses,
                mainClasses,
                streams,
                years,
                subjects,
                classSubjects
            ) => {
                // Teachers
                this.teachers = teachers.data.filter(s => s.isTeacher).map(t => ({
                    ...t,
                    fullName: `${t.firstName || ''} ${t.otherName || ''} ${t.lastName || ''}`.trim()
                }));

                // Lookup tables
                this.classes = levelClasses.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.academicYears = years.data;
                this.subjects = subjects.data;
                this.classSubjects = classSubjects.data;
                const current = years.data.find(y => y.isActive);
                if (current) this.selectedAcademicYear = current;

                this.$nextTick(() => {
                    this.loadDropdowns();
                });

            })).catch(() => this.toastHandler('error', 'Unable to load data.'));
        },

        loadTeachers() {
            axios.get('/SmStaffSetups/ListAllStaffBios')
                .then(res => {
                    this.teachers = res.data
                        .filter(s => s.isTeacher)
                        .map(t => ({
                            ...t,
                            fullName: [t.firstName, t.otherName, t.lastName]
                                .filter(x => x && x.trim())
                                .join(' ')
                        }))
                        .sort((a, b) =>
                            a.fullName.localeCompare(b.fullName, undefined, { numeric: true })
                        );
                })
                .catch(() => this.toastHandler('error', 'Unable to load teachers.'));
        },
        loadClasses() {
            axios.get('/SmMainSetups/ListAllLevelClasses/')
                .then(res => {
                    this.classes = res.data
                        .map(c => ({
                            ...c,
                            fullName: this.getLevelClassName(c)
                        }))
                        .sort((a, b) =>
                            a.fullName.localeCompare(b.fullName, undefined, { numeric: true })
                        );

                    this.loadDropdowns();
                })
                .catch(() => this.toastHandler('error', 'Unable to load classes.'));
        },


        loadAcademicYears() {
            axios.get('/SmMainSetups/ListAllAcademicYears')
                .then(res => {
                    this.academicYears = res.data;
                    const current = res.data.find(y => y.isActive);
                    if (current) this.selectedAcademicYear = current;
                })
                .catch(() => this.toastHandler('error', 'Unable to load academic years.'));
        },

      
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getLevelClassNameFromId(levelClassId) {
            const levelClass = this.getLevelClassById(levelClassId);
            if (!levelClass) return '';

            const cls = this.getMainClassName(levelClass.classId);
            const stream = this.getStreamName(levelClass.streamId);

            return `${cls} ${stream}`.trim();
        },
        getLevelClassName(levelClass) {
            const cls = this.getMainClassName(levelClass.classId);
            const stream = this.getStreamName(levelClass.streamId);
            return `${cls} ${stream}`.trim();
        },

        getLevelClassById(levelClassId) {
            return this.classes.find(c => c.id === levelClassId);
        },

        getAcademicYearName(id) {
            return this.academicYears.find(y => y.id === id)?.name || '';
        },
        getTeacherName(staffId) {
            return this.teachers.find(t => t.id === staffId)?.fullName || '';
        },

       getSubjectName(subjectId) {
            return this.subjects.find(s => s.id === subjectId)?.name || '';
       },
        
       
        
        

        loadTeacherSubjects() {
            axios.get('/SmStaffSetups/ListAllTeacherSubjects')
                .then(res => this.teacherSubjects = res.data)
                .catch(() => this.toastHandler('error', 'Unable to load teacher subjects.'));
        },
        loadDropdowns(){
            const current = this.academicYears.find(y => y.isActive);

            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },

                change: args => {
                    this.academicYearId = args.value;
                    this.selectedAcademicYear = this.academicYears.find(y => y.id === args.value);
                }
            });
            if (current) {
                this.academicYearId = current.id;

                const ddl = $("#academicYearId").data("ejDropDownList");
                ddl.option("value", current.id);
            }
            $('#teacherId').ejDropDownList({
                dataSource: this.teachers,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "fullName", value: "id" },
                change: args => {
                    this.teacherId = args.value;
                    this.selectedTeacher = this.teachers.find(y => y.id === args.value);
                },

            });
            
            $('#classId').ejDropDownList({
                dataSource: this.classes,
                width: "100%",
                watermarkText: "Select Class",
                enableFilterSearch: true,

                fields: {
                    text: "fullName",
                    value: "id"
                },

                change: (args) => {
                    this.classId = args.value;
                }
            });
            
            $('#subjectId').ejDropDownList({
                dataSource: this.subjects,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: {
                    text: "name",
                    value: "id"
                },
                change: (args) => {
                    this.subjectId = args.value;
                    this.selectedSubject = this.subjects.find(y => y.id === args.value);
                }
            });

        },
        assignSubject() {
            if (!this.teacherId || !this.classId || !this.subjectId || !this.academicYearId) return;

            const payload = {
                staffId: this.teacherId,
                classId: this.classId,
                subjectId: this.subjectId,
                academicYearId: this.academicYearId,
            };

            axios.post('/SmStaffSetups/CreateTeacherSubject', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'data saved.');
                        this.selectedClass = null;
                        this.loadTeacherSubjects();
                    } else {
                        this.toastHandler('error', response.data.message);
                        this.loadTeacherSubjects();
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to assign subject.'));
        },

        deleteTeacherSubject(id) {
            axios.post(`/SmStaffSetups/DeleteTeacherSubject?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Subject assignment deleted successfully.');
                    this.loadTeacherSubjects();
                })
                .catch(() => this.toastHandler('error', 'Unable to delete assignment.'));
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 5000,
            };
            switch (type) {
                case 'warning': toastr.warning('', message); break;
                case 'error': toastr.error('', message); break;
                default: toastr.success('', message); break;
            }
        }
    },
    watch: {
        selectedClass() {
            this.selectedSubject = null;
        }
    },
    mounted() {
        this.loadLookups();
        this.loadClasses();
        this.loadTeacherSubjects();
    }
});
app.mount('#app');
