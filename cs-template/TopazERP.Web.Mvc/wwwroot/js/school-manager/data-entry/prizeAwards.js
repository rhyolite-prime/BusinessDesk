const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,

            form: {
                id: null,
                tenantId: null,

                academicYearId: null,
                academicYearName: null,

                termId: null,
                termName: null,

                levelId: null,
                levelName: null
            },


            details: [],

            awards: [],
            prizes: [],
            academicYears: [],
            terms: [],
            levels: [],
            students: [],
            prizeAwards: [],
            studentsInLevel: [],
            classes: []
        }
    },

    methods: {
        printPreview() {
            if (!this.form.academicYearId || !this.form.termId || !this.form.levelId) {
                this.toastHandler('warning', 'Please select Year, Term and Level');
                return;
            }

            const currentDate = new Date().toLocaleDateString();

            // Filter prize awards for selected academic year, term, level
            const records = this.prizeAwards
                .filter(p => p.academicYearId === this.form.academicYearId &&
                    p.termId === this.form.termId &&
                    p.levelId === this.form.levelId)
                .flatMap(p => p.details || []);

            if (!records.length) {
                this.toastHandler('warning', 'No prize awards to print for the selected criteria.');
                return;
            }

            let html = `
<html>
<head>
    <title>Prize Awards Report</title>
    <style>
         body { font-family:"Times New Roman"; margin: 20px; }
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 80px;
            text-align: center;
            z-index: 999;
        }
        .header h3, .header h4 { margin: 5px 0; }
        .content { 
            margin-top: 90px; 
            margin-bottom: 60px; 
            width: 100%;
        }
       table { width: 100%; border-collapse: collapse; margin-top: 20px; }
       th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
       thead {border-bottom: 1px solid #000;}
       th { background-color: #f2f2f2; border : none;}
       td {border: none;}
        @media print {
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
                background-color: white;
            }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h4>Prize Awards - Academic Year: ${this.form.academicYearName || ''} | Term: ${this.form.termName || ''} | Level: ${this.form.levelName || ''}</h4>
    </div>

    <div class="content">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Award</th>
                    <th>Prize</th>
                </tr>
            </thead>
            <tbody>
                ${records.map((r, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${r.studentName || ''}</td>
                        <td>${r.awardName || ''}</td>
                        <td>${r.prizeName || ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer">
                <div class="right">Printed On - ${currentDate}</div>
                 <div class="center">Topaz School Manager</div>
                <div class="left">Page 1</div>
            </div>
</body>
</html>
`;

            const printWindow = window.open('', '', 'width=1200,height=800');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        },

        getPrizeAwards() {

            if (!this.form.academicYearId || !this.form.termId || !this.form.levelId) {
                return;
            }

            axios.get('/SmDataEntry/GetAllPrizeAwards/')
                .then(response => {

                    this.prizeAwards = response.data;

                    const header = this.prizeAwards.find(x =>
                        x.academicYearId === this.form.academicYearId &&
                        x.termId === this.form.termId &&
                        x.levelId === this.form.levelId
                    );

                    if (header) {
                        this.form.id = header.id;
                        this.form.tenantId = header.tenantId;

                        this.form.academicYearId = header.academicYearId;
                        this.form.academicYearName = header.academicYearName;

                        this.form.termId = header.termId;
                        this.form.termName = header.termName;

                        this.form.levelId = header.levelId;
                        this.form.levelName = header.levelName;

                        this.dataTable(header.details);
                    } else {
                        this.form.id = null;
                        this.form.tenantId = null;
                        this.dataTable([]);
                    }


                })
                .catch(() => {
                    this.toastHandler('error', 'Unable to get prize awards.');
                });
        },

        loadDropdowns() {

            axios.all([
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevels/'),
                axios.get('/SmDataEntry/GetAllAwardTypes/'),
                axios.get('/SmDataEntry/GetAllPrizeTypes/'),
                axios.get('/SmMainSetups/ListAllLevelClasses/')
            ]).then(axios.spread((
                students, terms, years, levels, awards, prizes,classes
            ) => {
                
                this.students = students.data
                this.students.forEach((student) => {
                    // Combine first and last names
                    student.name = student.firstName + ' ' + student.lastName;
                });
                this.academicYears = years.data;
                this.terms = terms.data;
                this.levels = levels.data;
                this.awards = awards.data;
                this.prizes = prizes.data;
                this.classes=classes.data;
                // Initialize dropdowns after data is ready
                this.initDropdowns();

            }));
        },
        filterStudents(levelId) {
            if (!levelId) {
                this.studentsInLevel = [];
                return;
            }

            this.studentsInLevel = this.students.filter(student => {
                const studentClass = this.classes.find(c => c.id === student.classId);
                return studentClass && studentClass.levelId === levelId;
            });
        },

        dataTable(data) {
            $("#dataTable").ejGrid({
                dataSource: data,
                allowPaging: false,
                allowSorting: true,

                editSettings: {
                    allowAdding: true,
                    allowEditing: true,
                    allowDeleting: true,
                    editMode: ej.Grid.EditMode.Normal
                },

                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [
                        ej.Grid.ToolBarItems.Add,
                        ej.Grid.ToolBarItems.Edit,
                        ej.Grid.ToolBarItems.Delete,
                        ej.Grid.ToolBarItems.Update,
                        ej.Grid.ToolBarItems.Cancel
                    ]
                },

                columns: [
                    { field: "id", isPrimaryKey: true, visible: false },

                    {
                        field: "studentId",
                        headerText: "Student",
                        editType: ej.Grid.EditingType.Dropdown,
                        foreignKeyField: "id",
                        foreignKeyValue: "name",
                        dataSource: this.studentsInLevel,
                        width: 150
                    },
                    {
                        field: "awardId",
                        headerText: "Award",
                        editType: ej.Grid.EditingType.Dropdown,
                        foreignKeyField: "id",
                        foreignKeyValue: "name",
                        dataSource: this.awards,
                        width: 120
                    },
                    {
                        field: "prizeId",
                        headerText: "Prize",
                        editType: ej.Grid.EditingType.Dropdown,
                        foreignKeyField: "id",
                        foreignKeyValue: "name",
                        dataSource: this.prizes,
                        width: 120
                    }
                ],
                actionBegin: args => {
                    if (args.requestType === "save" && !args.data.id) {
                        args.data.id = this.uuid();
                    }
                }

            });
        },
        deleteData(id) {
            id =  this.form.id;
            if (!this.form.id) {
                this.toastHandler('warning', 'No prize award selected to delete.');
                return;
            }
            if (!confirm('Are you sure you want to delete this prize award and all its details?')) {
                return;
            }
            
            axios.delete('/SmDataEntry/DeletePrizeAward?id='+id)
                .then(() => {
                    this.toastHandler('success', 'Prize award deleted successfully.');

                    // Reset the form and grid
                    this.form.id = null;
                    this.form.tenantId = null;
                    this.form.academicYearId = null;
                    this.form.academicYearName = null;
                    this.form.termId = null;
                    this.form.termName = null;
                    this.form.levelId = null;
                    this.form.levelName = null;

                    this.dataTable([]); // clear the grid

                    // Reload prize awards list
                    this.getPrizeAwards();
                })
                .catch(() => {
                    this.toastHandler('error', 'Failed to delete prize award.');
                });
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
                    this.form.academicYearName = args.text;
                    this.getPrizeAwards();
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.form.academicYearId = activeYear.id;
                this.form.academicYearName = activeYear.name;
                this.getPrizeAwards();
            }
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.termId = args.value;
                    this.getPrizeAwards();
                }
            });
            $('#levelId').ejDropDownList({
                dataSource: this.levels,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "levelName", value: "id" },
                change: args => {
                    this.form.levelId = args.value;
                    this.filterStudents(args.value);
                    this.getPrizeAwards();
                }
            });
           
        },
        saveData() {

            if (!this.form.academicYearId || !this.form.termId || !this.form.levelId) {
                this.toastHandler('warning', 'Please select Year, Term and Level');
                return;
            }

            const grid = $("#dataTable").ejGrid("instance");
            const records = grid.model.dataSource;

            if (!records.length) {
                this.toastHandler('warning', 'Please add at least one record');
                return;
            }
            this.form.academicYearName = this.academicYears.find(y => y.id === this.form.academicYearId)?.name || '';
            this.form.termName = this.terms.find(y => y.id === this.form.termId)?.name || '';
            this.form.levelName = this.levels.find(y => y.id === this.form.levelId)?.levelName || '';


            const payload = {
                id: this.form.id,
                tenantId: this.form.tenantId,

                academicYearId: this.form.academicYearId,
                academicYearName: this.form.academicYearName,

                termId: this.form.termId,
                termName: this.form.termName,

                levelId: this.form.levelId,
                levelName: this.form.levelName,

                details: records.map(r => {
                    const student = this.students.find(s => s.id === r.studentId);
                    const award = this.awards.find(a => a.id === r.awardId);
                    const prize = this.prizes.find(p => p.id === r.prizeId);

                    return {
                        id: r.id,
                        studentId: r.studentId,
                        studentName: student ? student.name : null,
                        awardId: r.awardId,
                        awardName: award ? award.name : null,
                        prizeId: r.prizeId,
                        prizeName: prize ? prize.name : null
                    };
                })
            };



            const url = this.form.id
                ? '/SmDataEntry/UpdatePrizeAward'
                : '/SmDataEntry/CreatePrizeAward';

            axios.post(url, payload)
                .then(() => {
                    this.toastHandler('success', 'Prize awards saved successfully');
                    this.getPrizeAwards();
                })
                .catch(() => {
                    this.toastHandler('error', 'Failed to save prize awards');
                });
        },


      


        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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

    mounted() {
        this.loadDropdowns();
        this.getPrizeAwards();
    

    },
});
app.mount('#app');