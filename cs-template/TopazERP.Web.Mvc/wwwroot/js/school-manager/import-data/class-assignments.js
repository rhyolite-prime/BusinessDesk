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
            type: 'ClassAssignment',
            academicYears: [],
            classes: [],
            subjects: [],
            academicYearName: '',
            termName: '',
            className: '',
            subjectId: '',
            subjectName: '',
            assignmentNumber: '',
            overallMark: 0,
            assignmentDate: '',
            assignmentNo: '',
            classSubjects: [],
            mainClasses: [],
            streams: [],
            mainSubjects: [],
            terms: [],
            isRawMark: true,
            IsPercentage: false,
            isPreviewLoading: false,
            debouncedPreview: null,
            allAssignments: [],
            assignmentExists: false,
            existingAssignmentList: [],
            existingAssignmentMessage: '',
            lockInputs: false,
        }
    },
    computed: {
        hasErrors() {
            return this.previewRows.some(r => r.error);
        },
        subjectsForSelectedClass() {
            if (!this.academicYearId || !this.termId || !this.classId) return [];

            const assigned = this.subjects.find(a =>
                a.academicYearId === this.academicYearId &&
                a.termId === this.termId &&
                a.classId === this.classId
            );

            return assigned ? assigned.details : [];
        }
    },
    methods: {
        loadAllAssignments() {
            axios.get('/SmResultsPromotions/GetAllResults', {
                params: { type: this.type }
            }).then(res => {
                this.allAssignments = res.data || [];

                // 🔑 re-check once data is available
                this.findExistingAssignment();
            });
        },
        findExistingAssignment() {
            const foundAssignments = this.allAssignments.filter(a =>
                a.academicYearId === this.academicYearId &&
                a.termId === this.termId &&
                a.classId === this.classId &&
                a.subjectId === this.subjectId &&
                a.assignmentNumber === this.assignmentNumber &&
                a.type === this.type &&
                a.isCanceled === false
            );
            if (foundAssignments.length) {
                this.assignmentExists = true;
                this.lockInputs = true;
                this.existingAssignmentMessage =
                    'Results already entered for these parameters. Please check the existing results before proceeding.';
                this.existingAssignmentList = foundAssignments;
                this.toastHandler('warning', this.existingAssignmentMessage);
            } else {
                this.assignmentExists = false;
                this.lockInputs = false;
                this.existingAssignmentMessage = '';
                this.existingAssignmentList = [];

            }
            console.log(this.existingAssignmentList);
        },
        downloadTemplate() {
            const params = new URLSearchParams({
                academicYearId: this.academicYearId,
                termId: this.termId,
                classId: this.classId,
                subjectId: this.subjectId
            }).toString();
            
            if (!this.academicYearId || !this.termId || !this.classId || !this.subjectId){
                this.toastHandler('warning', 'Please select Academic Year, Term, Class and Subject');
                return;
            }

            window.open(`/SmImportData/DownloadAssignmentTemplate?${params}`, '_blank');
        },
        onFileUpload(e) {
            if (this.academicYearId === '' || this.termId === '' || this.classId === '' || this.subjectId === '') {
                this.toastHandler('warning', 'Please select Academic Year, Term, Class and Subject');
                return;
            }

            if (this.assignmentNumber === '' || this.assignmentNumber === null) {
                this.toastHandler('error', 'Please enter assignment number.');
                return;
            }
            if (this.overallMark === '' || this.overallMark === null || isNaN(this.overallMark) || this.overallMark <= 0) {
                this.toastHandler('error', 'Please enter a valid overall mark.');
                return;
            }

            const selectedFile = e.target.files[0];

            if (!selectedFile) return;

            this.file = selectedFile;
            this.previewRows = [];

            this.previewFile();
        },


        previewFile() {
            if (!this.file || !this.classId) return;
            const mark = Number(this.overallMark);
            if (!mark || mark <= 0) {
                this.toastHandler('error', 'Overall mark must be greater than 0 to preview.');
                this.previewRows = [];
                return;
            }

            if (this.assignmentNumber === '' || this.assignmentNumber === null) {
                this.toastHandler('error', 'Please enter assignment number.');
                this.previewRows = [];
                return;
            }
            let formData = new FormData();
            formData.append("customFile", this.file);
            formData.append("classId", this.classId);
            formData.append("overallMark", this.overallMark);
            
            this.isPreviewLoading = true;
            axios.post("/SmImportData/PreviewAssignments/", formData)
                .then(res => {
                    this.previewRows = res.data.result || [];
                }).catch(err => {
                toastr.error(err.response?.data?.message || "Preview failed");
                this.previewRows = [];
            })
                .finally(() => {
                    this.isPreviewLoading = false;
                });
        },
        debounce(fn, delay = 500) {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn.apply(this, args), delay);
            };
        },
        importAssignments() {
            const validRows = this.previewRows.filter(x => !x.error);

            if (validRows.length === 0) {
                toastr.warning("No valid records to import");
                return;
            }

            const details = validRows.map(x => ({
                id : x.id,
                studentId: x.studentId,
                studentIdentifier: x.studentIdentifier,
                studentName: x.studentName,
                marks: x.marks
            }));

            axios.post('/SmImportData/ImportAssignments', {
                academicYearId: this.academicYearId,
                academicYearName: this.academicYearName,
                termId: this.termId,
                termName: this.termName,
                classId: this.classId,
                className: this.className,
                subjectId: this.subjectId,
                subjectName: this.subjectName,
                assignmentNumber: this.assignmentNumber,
                isRawMark: this.isRawMark,
                IsPercentage: this.IsPercentage,
                type: "ClassAssignment",
                overallMark: this.overallMark,
                assignedDate: this.assignmentDate
                    ? new Date(this.assignmentDate).toISOString()
                    : null,
                details: details
            }).then(res => {
                    const result = res.data?.result;

                    if (!result) {
                        toastr.error("Invalid server response");
                        return;
                    }
                    toastr[result.code === 200 ? 'success' : 'error'](result.message);
                this.previewRows = [];
                }).catch(err => {
                    toastr.error(err.response?.data?.message || "Import failed");
                this.previewRows = [];
                });
        },
        
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmDataEntry/GetAllAssignedSubjects/'),
                axios.get('/SmMainSetups/ListAllClasses/'), 
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllSubjects/'),
            ]).then(axios.spread((years, classes, terms, subjects, mainClasses, streams, mainSubjects) => {

                this.academicYears = years.data;

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;

                this.terms = terms.data;
                this.mainSubjects = mainSubjects.data;

                // ✅ FIXED
                this.subjects = subjects.data;
                

                this.initDropdowns();
            }));
        },
        getSubjectName(subjectId) {
            return this.mainSubjects.find(s => s.id === subjectId)?.name || '';
        },
        subjectsBySelection() {
            if (!this.academicYearId || !this.termId || !this.classId) {
                this.classSubjects = [];
                this.refreshSubjectDropdown([]);
                return;
            }

            const match = this.subjects.find(s =>
                s.academicYearId === this.academicYearId &&
                s.termId === this.termId &&
                s.classId === this.classId
            );

            const subjects = match
                ? match.details.map(d => ({
                    id: d.subjectId,
                    name: this.getSubjectName(d.subjectId)
                }))
                : [];

            this.classSubjects = subjects;
            this.refreshSubjectDropdown(subjects);
        },
        refreshSubjectDropdown(data) {
            const ddl = $('#subjectId').data('ejDropDownList');

            if (ddl) {
                ddl.option({
                    dataSource: data,
                    value: null
                });
            }
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
                    this.subjectsBySelection();
                    this.findExistingAssignment();
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
                    this.subjectsBySelection();
                    this.findExistingAssignment();
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
                    this.subjectsBySelection();
                    this.findExistingAssignment();
                }

            });
            $('#subjectId').ejDropDownList({
                dataSource: [],
                width: "100%",
                watermarkText: "Select Subject",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.subjectId = args.value;
                    const selected = this.classSubjects.find(s => s.id === args.value);
                    this.subjectName = selected ? selected.name : '';
                    this.findExistingAssignment();

                }
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
    watch: {
        overallMark(val) {
            const mark = Number(val);

            if (mark <= 0) {
                this.toastHandler('error', 'Overall mark must be greater than 0.');
                return;
            }

            if (this.file) {
                this.debouncedPreview();
            }
        },
        classId() {
            if (this.file && Number(this.overallMark) > 0) {
                this.previewFile();
            }
        },
        assignmentNumber(val) {
            if (!val || !this.allAssignments.length) return;

            this.findExistingAssignment();
        }
    },
    mounted() {
        this.loadDropdowns();

        // ✅ create debounced re-preview
        this.debouncedPreview = this.debounce(() => {
            if (this.file && this.classId && Number(this.overallMark) > 0) {
                this.previewFile();
            }
        }, 500);
        this.loadAllAssignments();
    },
});
app.mount('#app');