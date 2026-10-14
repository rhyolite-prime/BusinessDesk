const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            academicYears: [],
            classes: [],
            subjects: [],
            mainClasses: [],
            streams: [],
            terms: [],
            students: [],
            currentDate: new Date().toLocaleDateString(),
            allLevels: [],
            academicYearTerm: [],
            classStudents: [],
            performanceAreas: [],
            performanceSkills: [],
            studentPerformanceSkills: [],
            academicYearId: null,
            termId: null,
            classId: null,
            studentId: null,
            tenantId: null,
            isSaved: false,
            date: new Date().toLocaleDateString(),
            performanceAreaId: null,
            performanceSkillId: null,
            allRecords: [],
            skills: [],
            selectedAreaIds: [],
            selectedSkillIdsByArea: {},
            existingStudentRecords: [],
            pendingDeletes: [],
            studentStatus:[]
        }
    },
    mounted() {
        this.getStudentStatus();
        this.loadDropdowns();
    },
    methods: {
    
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
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
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmMainSetups/ListAllLevels/'),
                axios.get('/SmMainSetups/ListAllPerformanceAreas'),
                axios.get('/SmMainSetups/ListAllPerformanceSkills'),
                axios.get('/SmResultsPromotions/GetAllSkills'),
                
            ]).then(axios.spread((years, classes, terms, mainClasses, streams, students, levels,performanceAreas, performanceSkills, studentPerformanceSkills) => {

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

                this.allLevels = levels.data;
                const primaryLevelIds = new Set(
                    (this.allLevels || [])
                        .filter(l => {
                            const name = String(l.actualLevelName || '').trim().toLowerCase();
                            return name === 'primary' || name === 'basic';
                        })
                        .map(l => String(l.id))
                );

                this.classes = (classes.data || []).filter(c =>
                    primaryLevelIds.has(String(c.levelId))
                );
                this.performanceAreas = performanceAreas.data;
                this.performanceSkills = performanceSkills.data;

               // attach skills to each area (optional, for display)
                this.performanceAreas.forEach(a => {
                    a.skills = this.performanceSkills.filter(p => String(p.performanceAreaId) === String(a.id));
                });

                // start with empty skills until area is selected
                this.skills = [];
                this.studentPerformanceSkills = studentPerformanceSkills.data;
                this.initDropdowns();
            }));
        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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
      
        getClassStudents(classId) {
            this.classStudents = this.students.filter(s => s.classId === classId);
            this.classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
            $('#studentId').ejDropDownList({
                dataSource: this.classStudents,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.studentId = args.value;
                }
            });
            return this.classStudents;
        },
        initDropdowns() {
            this.date = new Date().toISOString().substr(0, 10);
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
                dataSource: this.classStudents,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.studentId = args.value;
                }
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
        loadStudentPerformanceSkills() {
            // reset UI state
            this.selectedAreaIds = [];
            this.selectedSkillIdsByArea = {};
            this.pendingDeletes = [];
            this.existingStudentRecords = [];

            // fetch all student skills records (you already use this endpoint)
            axios.get('/SmResultsPromotions/GetAllSkills')
                .then(res => {
                    const all = res.data || [];

                    // filter to this student + current selected academicYear/term/class if needed
                    const mine = all.filter(r =>
                        String(r.studentId) === String(this.studentId) &&
                        (this.academicYearId ? String(r.academicYearId) === String(this.academicYearId) : true) &&
                        (this.termId ? String(r.termId) === String(this.termId) : true) &&
                        (this.classId ? String(r.classId) === String(this.classId) : true)
                    );

                    this.existingStudentRecords = mine;

                    // populate selected areas + skills
                    const areaSet = new Set();
                    const map = {};

                    mine.forEach(r => {
                        if (r.performanceAreaId) {
                            areaSet.add(String(r.performanceAreaId));
                            if (!map[String(r.performanceAreaId)]) map[String(r.performanceAreaId)] = [];
                            if (r.performanceSkillId) map[String(r.performanceAreaId)].push(String(r.performanceSkillId));
                        }
                    });

                    this.selectedAreaIds = Array.from(areaSet);
                    this.selectedSkillIdsByArea = map;
                })
                .catch(() => this.toastHandler('error', 'Failed to load student performance skills.'));
        },
        toggleArea(areaId) {
            const id = String(areaId);
            const idx = this.selectedAreaIds.findIndex(x => String(x) === id);

            if (idx >= 0) {
                this.selectedAreaIds.splice(idx, 1);

                const toDelete = (this.existingStudentRecords || [])
                    .filter(r => String(r.performanceAreaId) === id)
                    .map(r => r.id)
                    .filter(Boolean);

                this.pendingDeletes.push(...toDelete);

                // ✅ reactive delete
                this.$delete(this.selectedSkillIdsByArea, id);
            } else {
                this.selectedAreaIds.push(id);

                // ✅ reactive add
                if (!this.selectedSkillIdsByArea[id]) {
                    this.$set(this.selectedSkillIdsByArea, id, []);
                }
            }
        },
        toggleSkill(areaId, skillId) {
            const aId = String(areaId);
            const sId = String(skillId);

            // ✅ reactive create if missing
            if (!this.selectedSkillIdsByArea[aId]) {
                this.$set(this.selectedSkillIdsByArea, aId, []);
            }

            const arr = this.selectedSkillIdsByArea[aId];
            const idx = arr.findIndex(x => String(x) === sId);

            if (idx >= 0) {
                arr.splice(idx, 1);

                const existing = (this.existingStudentRecords || []).find(r =>
                    String(r.performanceAreaId) === aId && String(r.performanceSkillId) === sId
                );
                if (existing?.id) this.pendingDeletes.push(existing.id);
            } else {
                arr.push(sId);
            }
        },
        getSkillsByArea(areaId) {
            return (this.performanceSkills || [])
                .filter(s => String(s.performanceAreaId) === String(areaId));
        },
        saveStudentPerformanceSkills() {
            if (!this.academicYearId || !this.termId || !this.classId || !this.studentId) {
                this.toastHandler('warning', 'Select Academic Year, Term, Class and Student first.');
                return;
            }

            const deletes = Array.from(new Set(this.pendingDeletes.filter(Boolean)));

            // Build a set of existing pairs (areaId|skillId)
            const existingPairs = new Set(
                (this.existingStudentRecords || [])
                    .filter(r => r.performanceAreaId && r.performanceSkillId)
                    .map(r => `${String(r.performanceAreaId)}|${String(r.performanceSkillId)}`)
            );

            // Build creates from current UI selections
            const creates = [];
            (this.selectedAreaIds || []).forEach(areaId => {
                const skillIds = this.selectedSkillIdsByArea[String(areaId)] || [];
                skillIds.forEach(skillId => {
                    const key = `${String(areaId)}|${String(skillId)}`;
                    if (!existingPairs.has(key)) {
                        creates.push({
                            id: this.uuid(),
                            academicYearId: this.academicYearId,
                            termId: this.termId,
                            classId: this.classId,
                            studentId: this.studentId,
                            date: this.currentDate,
                            tenantId: this.tenantId,
                            performanceAreaId: areaId,
                            performanceSkillId: skillId
                        });
                    }
                });
            });

            this.isLoading = true;

            // 1) run deletes (if you have a delete endpoint)
            const deleteCalls = deletes.map(id =>
                axios.get('/SmResultsPromotions/DeleteSkill?id=' + id)
            );

            // 2) run creates (if you have a create endpoint)
            // CHANGE this endpoint to your real one (CreateSkill / CreateStudentSkill etc.)
            const createCalls = creates.map(payload =>
                axios.post('/SmResultsPromotions/CreateSkill', payload)
            );

            Promise.all([...deleteCalls, ...createCalls])
                .then(() => {
                    this.toastHandler('', 'Saved successfully.');
                    // reload to refresh ids + existing records
                    this.loadStudentPerformanceSkills();
                })
                .catch(() => this.toastHandler('error', 'Save failed.'))
                .finally(() => (this.isLoading = false));
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
    watch: {
        studentId: function (newVal) {
            if (!newVal) return;
            this.loadStudentPerformanceSkills();
        }
    },
    computed: {
        liveRows() {
            const rows = [];
            const areasById = new Map((this.performanceAreas || []).map(a => [String(a.id), a]));
            const skillsById = new Map((this.performanceSkills || []).map(s => [String(s.id), s]));

            (this.selectedAreaIds || []).forEach(areaId => {
                const area = areasById.get(String(areaId));
                const skillIds = this.selectedSkillIdsByArea[String(areaId)] || [];

                // if no skills selected yet, still show area row (optional)
                if (!skillIds.length) {
                    rows.push({
                        performanceAreaId: String(areaId),
                        performanceAreaName: area?.name || '',
                        performanceSkillId: null,
                        performanceSkillName: '(none selected)'
                    });
                } else {
                    skillIds.forEach(skillId => {
                        const skill = skillsById.get(String(skillId));
                        rows.push({
                            performanceAreaId: String(areaId),
                            performanceAreaName: area?.name || '',
                            performanceSkillId: String(skillId),
                            performanceSkillName: skill?.name || ''
                        });
                    });
                }
            });

            return rows;
        }
    }
});
app.mount('#app');