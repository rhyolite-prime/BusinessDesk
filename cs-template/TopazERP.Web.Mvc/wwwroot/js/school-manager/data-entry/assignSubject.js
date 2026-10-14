const app = Vue.createApp({
    data() {
        return {
            academicYears: [],
            classes: [],
            terms: [],
            subjects: [],
            saving: false,
            form: {
                id: null,
                academicYearId: null,
                academicYearName: '',
                classId: null,
                className: '',
                termId: null,
                termName: '',
                details: [],
                tenantId: null,
            },
            assignedSubjects: [],
            mainClasses: [],
            streams: [],
        }
    },

    async mounted() {
        this.getAllAssignedSubjects();
        await this.loadAcademicYears();
        await this.loadLevelClasses();
        await this.loadTerms();
        await this.loadClasses();
        await this.loadStreams();
        await this.loadSubjects();
        await this.loadDropdowns();
    },
    computed: {
        allSubjectsSelected() {
            return this.subjects.length > 0 &&
                this.form.details.length === this.subjects.length;
        }
    },

    methods: {
        printPreview() {
            if (!this.form.details || this.form.details.length === 0) {
                this.toastHandler('warning', 'Select Term and Class with assigned subjects to print preview.');
                return;
            }

            const currentDate = new Date().toLocaleDateString();
            const reportHeader = `Subjects for ${this.form.className || ''} for ${this.form.termName || ''}, ${this.form.academicYearName || ''}`;

            // Build HTML
            let html = `
            <html>
            <head>
                <title>Assigned Subjects Report</title>
                <style>
                    body { font-family:"Times New Roman"; margin: 20px; }
                    h3, h4 { text-align: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
                    thead {border-bottom: 1px solid #000;}
                    th { background-color: #f2f2f2; border : none;}
                    td {border: none;}

                    /* Footer styling */
                    @media print {
                        body { margin-bottom: 100px; }
                        .footer { 
                            position: fixed; 
                            bottom: 0; 
                            left: 0; 
                            right: 0; 
                            height: 50px; 
                            border-top: 1px solid #000; 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center; 
                            font-size: 12px; 
                            padding: 0 20px;
                        }
                    }
                </style>
            </head>
            <body>
           
                <h4><strong>${reportHeader}</strong></h4>
                
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Subject Name</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

            this.form.details.forEach((d, i) => {
                html += `
        <tr>
            <td>${i + 1}</td>
            <td>${this.getSubjectName(d.subjectId)}</td>
        </tr>
    `;
            });


            html += `
                    </tbody>
                </table>

                <!-- Footer -->
                <div class="footer">
                <div class="right">Printed On - ${currentDate}</div>
                 <div class="center">Topaz School Manager</div>
                <div class="left">Page 1</div>
            </div>
            </body>
            </html>
        `;

            const printWindow = window.open('', '', 'width=900,height=600');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
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
                        this.form.academicYearName = header.academicYearName;

                        this.form.termId = header.termId;
                        this.form.termName = header.termName;

                        this.form.classId = header.classId;
                        this.form.className = header.className;
                        
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
                    this.form.academicYearId = args.value;
                    this.findAssignedSubject();
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.form.academicYearId = activeYear.id;
                this.form.academicYearName = activeYear.name;
                this.findAssignedSubject();
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
                    this.findAssignedSubject();
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
                    this.findAssignedSubject();
                }

            });
            
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

        toggleSelectAll() {
            if (this.allSubjectsSelected) {
                this.form.details = [];
                return;
            }
            this.form.details = this.subjects.map(s => ({ id: this.uuid(), subjectId: s.id }));
        },

        isSelected(subjectId) {
            return this.form.details.some(x => x.subjectId === subjectId);
        },

     
        /* ===========================
           SET DISPLAY NAMES
        ============================ */
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

        /* ===========================
           DETAILS LOGIC
        ============================ */
        addSubject(subjectId) {
            if (!subjectId) return;

            // prevent duplicates
            const exists = this.form.details.some(x => x.subjectId === subjectId);
            if (exists) return;

            const subject = this.subjects.find(x => x.id === subjectId);
            if (!subject) return;

            this.form.details.push({
                id: this.uuid(),
                subjectId: subject.id,
                subjectName: subject.name
            });
        },

        removeDetail(index) {
            this.form.details.splice(index, 1);
        },

        /* ===========================
           SAVE
        ============================ */
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        save() {

            if (!this.form.academicYearId || !this.form.classId || !this.form.termId) {
                this.toastHandler('error', 'Please complete all selections');
                return;
            }

            if (this.form.details.length === 0) {
                this.toastHandler('error', 'Please assign at least one subject');
                return;
            }

            this.saving = true;

            const api = this.form.id
                ? '/SmDataEntry/UpdateAssignedSubject'
                : '/SmDataEntry/CreateAssignedSubject';
            
            axios.post(api, this.form)
                .then(() => {
                    this.toastHandler('', 'Data saved successfully.');
                    this.resetForm();
                    this.getAllAssignedSubjects();
                    
                })
                .catch(() => {
                    this.toastHandler('error', 'Failed to save data.');
                })
                .finally(() => {
                    this.saving = false; 
                });
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
                    subjectName: d.subjectName
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
    }
});
app.mount('#app');