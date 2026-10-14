const app = Vue.createApp({
    data() {
        return {
            teachers: [],
            classes: [],
            academicYears: [],
            teacherClasses: [],
            selectedTeacher: null,
            selectedClass: null,
            selectedAcademicYear: null,
            currentPage: 1,
            perPage: 5,
            mainClasses: [],      // Main classes
            streams: [],
            // Search
            searchQuery: '',
            academicYearId: null,
            selectedAcademicYearId: null,
            teacherId: null,
            classId: null,
            academicYear: null,
        }
    },
    computed: {
        groupedTeacherClasses() {
            const grouped = {};

            this.teacherClasses.forEach(tc => {
                if (!grouped[tc.staffId]) {
                    grouped[tc.staffId] = {
                        staffId: tc.staffId,
                        classes: []
                    };
                }
                grouped[tc.staffId].classes.push(tc);
            });

            let result = Object.values(grouped);

            if (this.selectedTeacher) {
                result = result.filter(t => t.staffId === this.selectedTeacher.id);
            }

            if (this.searchQuery.trim() !== '') {
                const q = this.searchQuery.toLowerCase();

                result = result.map(t => {
                    const teacherName = this.getTeacherName(t.staffId).toLowerCase();

                    const filteredClasses = t.classes.filter(c => {
                        const className =
                            this.getLevelClassNameFromId(c.classId).toLowerCase();
                        return className.includes(q) || teacherName.includes(q);
                    });

                    return { ...t, classes: filteredClasses };
                }).filter(t => t.classes.length > 0);
            }

            return result;
        },

        paginatedTeacherClasses() {
            const start = (this.currentPage - 1) * this.perPage;
            const end = start + this.perPage;
            return this.groupedTeacherClasses.slice(start, end);
        },

        totalPages() {
            return Math.ceil(this.groupedTeacherClasses.length / this.perPage);
        },
        paginationPages() {
            const total = this.totalPages;
            const current = this.currentPage;
            const delta = 2; // how many pages around current

            const range = [];
            const rangeWithDots = [];

            let l;

            for (let i = 1; i <= total; i++) {
                if (
                    i === 1 ||
                    i === total ||
                    (i >= current - delta && i <= current + delta)
                ) {
                    range.push(i);
                }
            }

            for (let i of range) {
                if (l) {
                    if (i - l === 2) {
                        rangeWithDots.push(l + 1);
                    } else if (i - l > 2) {
                        rangeWithDots.push('...');
                    }
                }
                rangeWithDots.push(i);
                l = i;
            }

            return rangeWithDots;
        },
    },
    methods: {
        loadLookups() {
            axios.all([
                axios.get('/SmStaffSetups/ListAllStaffBios'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
            ]).then(axios.spread((
                teachers,
                levelClasses,
                mainClasses,
                streams,
                years
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
        loadTeacherClasses() {
            axios.get('/SmStaffSetups/ListAllTeacherClasses')
                .then(res => this.teacherClasses = res.data)
                .catch(() => this.toastHandler('error', 'Unable to load teacher classes.'));
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
                    this.selectedTeacher = this.teachers.find(y => y.id === args.value);
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
           
        },
        assignClass() {
            if (!this.teacherId || !this.classId || !this.academicYearId) return;

            const payload = {
                staffId: this.teacherId,
                classId: this.classId,
                academicYearId: this.academicYearId
            };


            axios.post('/SmStaffSetups/CreateTeacherClass', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'data saved.');
                        this.selectedClass = null;
                        this.loadTeacherClasses();
                    } else {
                        this.toastHandler('error', response.data.message);
                        this.loadTeacherClasses();
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to assign class.'));
        },

        deleteTeacherClass(id) {
            axios.post(`/SmStaffSetups/DeleteTeacherClass?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Class assignment deleted successfully.');
                    this.loadTeacherClasses();
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
    mounted() {
        this.loadLookups();
        this.loadClasses();
        this.loadTeacherClasses();
    }

});
app.mount('#app');
