const app = Vue.createApp({
    data() {
        return {
            activeTab: 'main',
            loading: false,
            form: {
                classId: null,
                className: '',
                academicYearId: null,
                academicYearName: '',
                termId: null,
                termName: '',
                assessments: [],
                tenantId: null
            },
            headers: [],
            headerForm: {
                id: null,
                name: '',
                options: [],
                tenantId: null
            },
            classes: [],
            students: [],
            academicYears: [],
            terms: [],
            assessmentHeaders: [],
            midTermAssessments: [],
            allOptions: [],
            headerOptionMap: {},
            assessmentTable: [],
            mainClasses: [],
            streams: [],
            currentPage: 1,
            perPage: 10,
            searchText: ''
        }
    },

    mounted() {
        this.loadHeaders();
        this.loadInitialData();
    },
    computed: {
        filteredAssessmentTable() {
            if (!this.searchText) return this.assessmentTable;

            const q = this.searchText.toLowerCase();

            return this.assessmentTable.filter(r =>
                r.studentName?.toLowerCase().includes(q)
            );
        },

        paginatedAssessmentTable() {
            const start = (this.currentPage - 1) * this.perPage;
            return this.filteredAssessmentTable.slice(start, start + this.perPage);
        },

        totalPages() {
            return Math.ceil(this.filteredAssessmentTable.length / this.perPage) || 1;
        }
    },
    watch: {
        searchText() {
            this.currentPage = 1;
        }
    },
    methods: {
        loadHeaders() {
            axios.get('/SmDataEntry/GetAllAssessmentHeader')
                .then(res => {
                    this.headers = res.data;
                    this.allOptions = [];
                    this.headerOptionMap = {};
                    this.headers.forEach(h => {
                       h.remarkId = h.id;
                       this.headerOptionMap[h.id] = h.options.map( o => {
                           o.remarkId = h.remarkId;
                           this.allOptions.push(o);
                           return o;
                       });
                    });

                    this.renderHeaderGrid(this.headers);
                });
        },
       
        renderHeaderGrid(data) {
            $("#dataTable").ejGrid({
                dataSource: data,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: {allowAdding: true, allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true},
                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel]
                },
                columns: [
                    { field: "id", isPrimaryKey: true, visible: false },
                    { field: "name", headerText: "Header Name", width: 200 }
                ],
                childGrid: {
                    dataSource: this.allOptions,
                    queryString: "remarkId",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: {
                        pageSize: 20,
                        pageSizeList: [10, 20, 50, 100]
                    },
                    scrollSettings: { width: "1200px", height: "400px" },
                    editSettings: {allowAdding: true, allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true},
                    toolbarSettings: {showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel]},
                    columns: [
                        { field: "id", isPrimaryKey: true, visible: false },
                        { field: "option", headerText: "Remarks", validationRules: { required: true } },
                        { field: "remarkId", visible: false }
                    ],
                    actionBegin: args => {

                        if (args.requestType === "save") {

                            const header = this.headers.find(h => h.id === args.data.remarkId);

                            if (!header)
                                return;

                            const optionText = (args.data.option || '').trim().toLowerCase();

                            // CHECK DUPLICATES
                            const duplicate = header.options.find(o =>
                                o.option?.trim().toLowerCase() === optionText &&
                                o.id !== args.data.id
                            );

                            if (duplicate) {

                                toastr.error("This remark option already exists");

                                args.cancel = true;

                                return;
                            }
                        }

                        // ADD
                        if (args.requestType === "save" && !args.data.id) {

                            args.data.id = this.uuid();

                            const header = this.headers.find(h => h.id === args.data.remarkId);

                            header.options.push(args.data);

                            this.updateHeader(header);
                        }

                        // UPDATE
                        if (args.requestType === "save" && args.data.id) {

                            const header = this.headers.find(h => h.id === args.data.remarkId);

                            const option = header.options.find(o => o.id === args.data.id);

                            Object.assign(option, args.data);

                            this.updateHeader(header);
                        }

                        // DELETE
                        if (args.requestType === "delete") {

                            const row = Array.isArray(args.data)
                                ? args.data[0]
                                : args.data;

                            const header = this.headers.find(h => h.id === row.remarkId);

                            header.options = header.options.filter(o => o.id !== row.id);

                            this.updateHeader(header);
                        }
                    }
                },
                endAdd: args => {
                    this.createHeader(args.data);
                },
                endEdit: args => {
                    const header = this.headers.find(h => h.id === args.data.id);
                    header.name = args.data.name; 
                    this.updateHeader(header);
                },

                endDelete: args => {
                    this.deleteHeader(args.data.id);
                }
                
            });
        },

        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        createHeader(data) {

            const payload = {
                name: data.name,
                options: []
            };

            axios.post('/SmDataEntry/CreateAssessmentHeader', payload)
                .then(() => {
                    toastr.success("Header created");
                    this.loadHeaders();
                })
                .catch(() => toastr.error("Failed to create header"));
        },


         updateHeader(header) {
             const payload = {
                 id: header.id,
                 name: header.name,
                 tenantId: header.tenantId,
                 options: header.options.map(o => ({
                     id: o.id,
                     option: o.option,
                     remarkId: header.id
                 }))
             };
 
             axios.post('/SmDataEntry/UpdateAssessmentHeader', payload)
                 .then(() => {
                     toastr.success("Header updated");
                     this.loadHeaders();
                 })
                 .catch(() => toastr.error("Failed to update header"));
         },


        deleteHeader(id) {
            axios.get('/SmDataEntry/DeleteHeader', { params: { id } })
                .then(() => {
                    toastr.success("Header deleted");
                    this.loadHeaders();
                })
                .catch(() => toastr.error("Failed to delete header"));
        },
        
        loadInitialData() {
            axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmDataEntry/GetAllAssessmentHeader'),
                axios.get('/SmDataEntry/GetAllMidTermAssessments'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/')
            ]).then(axios.spread((classes, students, headers, assessments,terms, years, mainClasses, streams) => {

                this.classes = classes.data;
                this.academicYears = years.data;
                this.terms = terms.data;
                this.students = students.data;
                this.assessmentHeaders = headers.data;
                this.midTermAssessments = assessments.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;

                this.initDropdowns();
            }));
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },

                change: args => {
                    this.form.academicYearId = args.value;
                    this.setAcademicYearName();
                    this.loadAssessmentTable();
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.form.academicYearId = activeYear.id;
                this.form.academicYearName = activeYear.name;
                this.setAcademicYearName();
                this.loadAssessmentTable();
            }
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));    

            $('#classId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.classId = args.value;
                    this.setClassName();
                    this.loadAssessmentTable();
                }
            });
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.termId = args.value;
                    this.setTermName();
                    this.loadAssessmentTable();
                }

            });
            const today = new Date().toISOString().substr(0, 10);
            this.form.departureDate = today;
            this.form.returnDate = today;

            // you can repeat same pattern for academicYear + term
        },
        setAcademicYearName() {
            const s = this.academicYears.find(x => x.id === this.form.academicYearId);
            this.form.academicYearName = s ? s.name : '';
        },
        setClassName() {
            const s = this.classes.find(x => x.id === this.form.classId);
            this.form.className = s ? s.name : '';
        },
        setTermName() {
            const s = this.terms.find(x => x.id === this.form.termId);
            this.form.termName = s ? s.name : '';
        },
        findExistingAssessment() {
            return this.midTermAssessments.find(a =>
                a.classId === this.form.classId &&
                a.academicYearId === this.form.academicYearId &&
                a.termId === this.form.termId
            );
        },

        loadAssessmentTable() {
            if (!this.form.classId || !this.form.termId || !this.form.academicYearId) return;

            const existing = this.findExistingAssessment();

            // students in selected class
            const classStudents = this.students.filter(
                s => s.classId === this.form.classId
            );

            this.assessmentTable = classStudents.map(student => {

                // find existing student assessment (if any)
                const studentAssessment = existing?.assessment?.find(
                    a => a.studentId === student.id
                );

                return {
                    studentId: student.id,
                    studentName: `${student.firstName || ''} ${student.otherName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim(),

                    headers: this.assessmentHeaders.map(h => {

                        // find existing header selection
                        const existingHeader = studentAssessment?.headers?.find(
                            eh => eh.id === h.id
                        );

                        return {
                            headerId: h.id,
                            headerName: h.name,
                            options: h.options,

                            selectedOptionId:
                                existingHeader?.options?.length
                                    ? existingHeader.options[0].id
                                    : null
                        };
                    })
                };
            });

            this.form.existingAssessmentId = existing?.id || null;
            this.form.tenantId = existing?.tenantId || null;
        },

        saveData() {
            const payload = {
                id: this.form.existingAssessmentId, // NULL for create
                classId: this.form.classId,
                className: this.form.className,
                academicYearId: this.form.academicYearId,
                academicYearName: this.form.academicYearName,
                termId: this.form.termId,
                termName: this.form.termName,
                tenantId: this.form.tenantId,
                assessment: this.assessmentTable.map(r => ({
                    id: this.uuid(),
                    studentId: r.studentId,
                    studentName: r.studentName,
                    headers: r.headers.map(h => ({
                        id: h.headerId,
                        name: h.headerName,
                        options: h.selectedOptionId
                            ? [{ id: h.selectedOptionId }]
                            : []
                    }))
                }))
            };

            const url = payload.id
                ? '/SmDataEntry/UpdateMidTermAssessment'
                : '/SmDataEntry/CreateMidTermAssessment';

            axios.post(url, payload)
                .then(() => {
                    toastr.success("Assessment saved");
                    this.loadInitialData();
                })
                .catch(() => toastr.error("Failed to save assessment"));
        },
        
    },

});
app.mount('#app');