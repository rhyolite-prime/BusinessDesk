const app = Vue.createApp({
    data() {
        return {
            academicYears: [],
            classes: [],
            terms: [],
            assignedSubjects: [],
            multiAssign: {
                sourceClassId: null,
                targetClassIds: [],
            },
            subjectsToAssign: [],
            form: {
                academicYearId: null,
                termId: null,
                academicYearName: '',
                termName: '',
                className: ''
            },
            subjects: [],
            saving: false,
            loading: false,
        }
    },

    computed: {
        availableTargetClasses() {
            if (!this.form.academicYearId || !this.form.termId) return [];
            return this.classes.filter(c => {
                return !this.assignedSubjects.some(a =>
                    a.classId === c.id &&
                    a.academicYearId === this.form.academicYearId &&
                    a.termId === this.form.termId
                );
            });
        },
        
        allTargetClassesSelected() {
            return this.availableTargetClasses.length > 0 &&
                this.multiAssign.targetClassIds.length === this.availableTargetClasses.length;
        }
    },
    watch: {
        'multiAssign.sourceClassId'(newVal) {
            this.loadSourceClassSubjects(newVal);
        },
        'form.academicYearId'() {
            this.multiAssign.targetClassIds = []; // reset selected target classes
        },
        'form.termId'() {
            this.multiAssign.targetClassIds = []; // reset selected target classes
        }
    },
    async mounted() {
        this.loadDropdowns();
        this.getAllAssignedSubjects();
        await this.loadAcademicYears();
        await this.loadLevelClasses();
        await this.loadTerms();
        await this.loadClasses();
        await this.loadStreams();
        await this.loadSubjects();
        await this.loadDropdowns();
    },
    methods: {
        toggleSelectAllTargetClasses() {
            if (this.allTargetClassesSelected) {
                this.multiAssign.targetClassIds = [];
            } else {
                this.multiAssign.targetClassIds = this.availableTargetClasses.map(c => c.id);
            }
        },
        getAllAssignedSubjects() {
            axios.get('/SmDataEntry/GetAllAssignedSubjects/')
                .then(response => {
                    this.assignedSubjects = response.data;
                    const header = this.assignedSubjects.find(x =>
                        x.academicYearId === this.form.academicYearId &&
                        x.termId === this.form.termId &&
                        x.classId === this.form.classId
                    );

                    if (header) {
                        this.form.id = header.id;
                        this.form.tenantId = header.tenantId;
                        this.form.academicYearId = header.academicYearId;
                        this.form.termId = header.termId;
                        this.form.classId = header.classId;
                    } else {
                        this.form.id = null;
                        this.form.tenantId = null;

                    }

                })
                .catch(() => {
                    this.toastHandler('error', 'Unable to fetch assigned subjects.');
                });
        },
        setDefaultAcademicYear() {

            const activeYear = this.academicYears.find(x => x.isActive === true);
            if (!activeYear) return;

            this.form.academicYearId = activeYear.id;
            this.form.academicYearName = activeYear.name;

            const ayDd = $('#academicYearId').data('ejDropDownList');
            if (ayDd) {
                ayDd.option('value', activeYear.id);
            }
        },
        async loadLevelClasses() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllLevelClasses/');
                this.classes = response.data;

            } catch (error) {
                console.error("Error loading level classes:", error);
            }
        },
        async loadAcademicYears() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllAcademicYears');

                this.academicYears = response.data;

                const activeYear = this.academicYears.find(y => y.isActive === true);

                this.academicYearId = activeYear ? activeYear.id : '';

            } catch (error) {
                console.error("Error loading academic years:", error);
            }
        },

        async loadTerms() {
            try {
                const response = await axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`);
                this.terms = response.data;

            } catch (error) {
                console.error("Error loading terms:", error);
            }
        },
        async loadSubjects() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllSubjects');

                this.subjects = response.data.sort((a, b) => a.name.localeCompare(b.name));

            } catch (error) {
                console.error("Error loading assigned subjects:", error);
            }
        },
        async loadClasses() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllClasses/');
                this.mainClasses = response.data;

            } catch (error) {
                console.error("Error loading classes:", error);
            }
        },


        async loadStreams() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllStreams/');
                this.streams = response.data;

            } catch (error) {
                console.error("Error loading streams:", error);
            }
        },
        loadDropdowns() {
            this.initDropdowns();
            this.setDefaultAcademicYear();
        },
       /* loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllSubjects'),
                axios.get('/SmMainSetups/ListAllClasses/'),  // main classes
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((years, levelClasses, terms, subjects, mainClasses, streams) => {

                // 1️⃣ Store the data
                this.academicYears = years.data;
                this.mainClasses = mainClasses.data;  // Main class names
                this.streams = streams.data;          // Stream names
                this.classes = levelClasses.data;     // Level classes with classId + streamId
                this.terms = terms.data;
                this.subjects = subjects.data.sort((a, b) => a.name.localeCompare(b.name));

                // 2️⃣ Initialize dropdowns
                this.initDropdowns();

                // 3️⃣ Set default academic year
                this.setDefaultAcademicYear();

            })).catch(() => {
                this.toastHandler('error', 'Failed to load dropdown data.');
            });
        },*/


        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);

            // Academic Year dropdown
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select Academic Year...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.academicYearId = args.value;
                    this.form.academicYearName = this.getAcademicYearName(args.value);
                    this.findAssignedSubject();
                },
                value: activeYear ? activeYear.id : null
            });

            // Terms dropdown
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select Term...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.termId = args.value;
                    this.form.termName = this.getTermName(args.value);
                    this.findAssignedSubject();
                }
            });

            // Source Class dropdown — use levelClassId + map to MainClass + Stream
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id, // levelClassId
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            $('#sourceClassId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select Source Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.multiAssign.sourceClassId = args.value; // selected levelClassId
                    this.form.classId = args.value;
                    this.form.className = this.getLevelClassNameFromId(args.value);
                    this.loadSourceClassSubjects(args.value);   // load subjects
                }
            });
        },

// Helper to get the display name of a level class
        getLevelClassNameFromId(levelClassId) {
            const levelClass = this.classes.find(c => c.id === levelClassId);
            if (!levelClass) return '';
            return `${this.getMainClassName(levelClass.classId)} ${this.getStreamName(levelClass.streamId)}`.trim();
        },

// Helpers for main class and stream
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        

        /* ===========================
           SUBJECT CHECKBOX LOGIC
        =========================== */
        getAcademicYearName(id) {
            return this.academicYears.find(y => y.id === id)?.name || '';
        },
        getClassName(id) {
            return this.classes.find(c => c.id === id)?.name || '';
        },
        getTermName(id) {
            return this.terms.find(t => t.id === id)?.name || '';
        },
        getSubjectName(subjectId) {
            return this.subjects.find(s => s.id === subjectId)?.name || '';
        },

        toggleSubjectCheckbox(subject) {
            const index = this.form.details.findIndex(x => x.subjectId === subject.id);
            if (index === -1) {
                this.form.details.push({ id: this.uuid(), subjectId: subject.id });
            } else {
                this.form.details.splice(index, 1);
            }
        },

        /* ===========================
           SUBJECT CHECKBOX LOGIC
        =========================== */

        subjectsByClass(classId) {
            if (!classId) return [];
            const cls = this.assignedSubjects.find(a => a.classId === classId);
            return cls ? cls.details : [];
        },
        
        

        isSelected(subjectId) {
            return this.form.details.some(x => x.subjectId === subjectId);
        },
        
        loadSourceClassSubjects(classId) {
            this.subjectsToAssign = [];

            if (!classId || !this.form.academicYearId || !this.form.termId) return;

            const cls = this.assignedSubjects.find(a =>
                a.classId === classId &&
                a.academicYearId === this.form.academicYearId &&
                a.termId === this.form.termId
            );

            if (!cls || !cls.details.length) {
                this.toastHandler('warning', 'No subjects found for this class in the selected year and term.');
                return;
            }

            // clone to avoid mutating original
            this.subjectsToAssign = cls.details.map(d => ({ ...d }));
        },

        removeSubjectFromTable(index) {
            this.subjectsToAssign.splice(index, 1);
        },

        assignSubjectsToClasses() {
            if (!this.multiAssign.targetClassIds.length) {
                this.toastHandler('warning', 'Select at least one target class.');
                return;
            }

            if (!this.subjectsToAssign.length) {
                this.toastHandler('warning', 'No subjects to assign.');
                return;
            }

            const requests = this.multiAssign.targetClassIds.map(classId => {
                const payload = {
                    academicYearId: this.form.academicYearId,
                    termId: this.form.termId,
                    classId,
                    details: this.subjectsToAssign.map(s => ({
                        id: this.uuid(),
                        subjectId: s.subjectId,
                    }))
                };
                return axios.post('/SmDataEntry/CreateAssignedSubject', payload);
            });

            axios.all(requests)
                .then(() => {
                    this.toastHandler('', 'Subjects assigned successfully!');
                    this.multiAssign.targetClassIds = [];
                    this.multiAssign.sourceClassId = null;
                    this.subjectsToAssign = [];
                    this.getAllAssignedSubjects();
                })
                .catch(() => {
                    this.toastHandler('error', 'Failed to assign subjects.');
                });
        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        findAssignedSubject() {

            if (!this.form.academicYearId || !this.form.classId || !this.form.termId)
                return;

            // ✅ Only exact match → EDIT MODE
            const exactMatch = this.assignedSubjects.find(x =>
                x.academicYearId === this.form.academicYearId &&
                x.classId === this.form.classId &&
                x.termId === this.form.termId
            );

            if (exactMatch) {
                this.form.id = exactMatch.id;
                this.form.tenantId = exactMatch.tenantId;

                this.form.details = exactMatch.details.map(d => ({
                    id: d.id,
                    subjectId: d.subjectId,
                }));
            } else {
                // ✅ Fresh assignment → EMPTY
                this.form.id = null;
                this.form.tenantId = null;
                this.form.details = [];
            }
        },




        resetForm() {
            this.form = {
                id: null,
                academicYearId: null,
                academicYearName: '',
                classId: null,
                className: '',
                termId: null,
                termName: '',
                details: [],
            };
            this.setDefaultAcademicYear();
            $("#classId").ejDropDownList("option", "value", "");
            $("#termId").ejDropDownList("option", "value", "");
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