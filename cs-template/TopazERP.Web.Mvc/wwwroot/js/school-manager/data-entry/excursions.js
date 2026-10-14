const app = Vue.createApp({
    data() {
        return {
            excursions: [],
            isEditMode: false,
            loading: false,
            activeTab: 'main',
            form: {
                id: null,
                departureDate: null,
                departureTime: null,
                returnDate: null,
                returnTime: null,
                point: '',
                destination: '',
                academicYearId: null,
                academicYearName: '',
                termId: null,
                termName: '',
                classId: null,
                className: '',
                students: [],
                teachers: [],
                tenantId: null,
            },

            students: [],
            teachers: [],
            academicYears: [],
            terms: [],
            classes: [],
            mainClasses: [],
            streams: [],
        }
    },

    mounted() {
       this.loadDropdowns();
        this.loadExcursions();
        
    },

    methods: {
        printPreview(excursion) {

            if (!excursion) {
                this.toastHandler?.('warning', 'No excursion selected');
                return;
            }

            const currentDate = new Date().toLocaleDateString();

            const teachers = excursion.teachers || [];
            const students = excursion.students || [];

            if (!students.length && !teachers.length) {
                this.toastHandler?.('warning', 'Nothing to print for this excursion');
                return;
            }

            let html = `
<html>
<head>
    <title>Excursion Print Preview</title>
    <style>
        body { font-family: "Times New Roman"; margin: 20px; }

        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 90px;
            text-align: center;
            z-index: 999;
        }

        .header h3, .header h4 {
            margin: 4px 0;
        }

        .content {
            margin-top: 110px;
            margin-bottom: 70px;
            width: 100%;
        }

        .section-title {
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 5px;
            text-decoration: underline;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        th, td {
            padding: 6px;
            font-size: 12px;
            text-align: left;
        }

        th {
            border-bottom: 1px solid #000;
            background-color: #f2f2f2;
        }

        td {
            border-bottom: 1px dotted #ccc;
        }

        .info-table td {
            border: none;
            padding: 4px;
            font-size: 13px;
        }

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
        <h3>Excursion Report</h3>
        <h4>
            Academic Year: ${excursion.academicYearName || ''} |
            Term: ${excursion.termName || ''} |
            Class: ${excursion.className || ''}
        </h4>
    </div>

    <div class="content">

        <!-- EXCURSION INFO -->
        <table class="info-table">
            <tr>
                <td><strong>Destination:</strong></td>
                <td>${excursion.destination || ''}</td>
                <td><strong>Departure Point:</strong></td>
                <td>${excursion.point || ''}</td>
            </tr>
            <tr>
                <td><strong>Departure:</strong></td>
                <td>${excursion.departureDate || ''} ${excursion.departureTime || ''}</td>
                <td><strong>Return:</strong></td>
                <td>${excursion.returnDate || ''} ${excursion.returnTime || ''}</td>
            </tr>
        </table>

        <!-- TEACHERS -->
        <div class="section-title">Excursion Officials</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Teacher Name</th>
                </tr>
            </thead>
            <tbody>
                ${teachers.map((t, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${t.teacherName || ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- STUDENTS -->
        <div class="section-title">Students on Excursion</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Student ID</th>
                    <th>Student Name</th>
                    <th>Present</th>
                </tr>
            </thead>
            <tbody>
                ${students.map((s, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${s.studentIdentifier || ''}</td>
                        <td>${s.studentName || ''}</td>
                        <td>${s.isPresent ? 'Yes' : 'No'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

    </div>

    <div class="footer">
        <div>Printed On - ${currentDate}</div>
        <div>Topaz School Manager</div>
        <div>Page 1</div>
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

        loadExcursions() {
            axios.get('/SmDataEntry/GetAllExcursions')
                .then(res => {
                    this.excursions = res.data;
                    // format date and time fields
                    this.excursions.forEach(e => {
                        e.departureDate = e.departureDate?.split('T')[0];
                        e.returnDate = e.returnDate?.split('T')[0];
                        e.className = this.getLevelClassNameFromId(e.classId);
                    });
                })
                .catch(() => {
                    toastr.error('Failed to load excursions');
                })
                .finally(() => {
                    this.loading = false;
                });
        }, 
        loadDropdowns() {
            axios.all([
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllAcademicYears'), 
                axios.get('/SmStaffSetups/ListAllStaffBios'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                ]).then(axios.spread((
                students, terms, years, teachers, classes,classes2, streams
                ) => {

                this.students = students.data
                this.students.forEach((student) => {
            // Combine first and last names
                student.name = student.firstName + ' ' + student.lastName;
            });
            this.academicYears = years.data;
            this.terms = terms.data;
            this.teachers =  teachers.data.filter(s => s.isTeacher);
            this.teachers.forEach(t => t.teacherName = `${t.firstName} ${t.otherName} ${t.lastName}`.trim());
                this.classes = classes.data;
                this.streams = streams.data;
                this.mainClasses = classes2.data;
            this.initDropdowns();
                
            
            }));
        },
        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getLevelClassNameFromId(levelClassId) {

            const levelClass = this.classes.find(c => c.id === levelClassId);

            if (!levelClass)
                return '';

            return `${this.getMainClassName(levelClass.classId)} ${this.getStreamName(levelClass.streamId)}`.trim();
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
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.form.academicYearId = activeYear.id;
                this.form.academicYearName = activeYear.name;
                this.setAcademicYearName();
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
                    this.loadStudentsByClass(args.value);
                    this.teachersDataTable([]);
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
                }

            });
            const today = new Date().toISOString().substr(0, 10);
            this.form.departureDate = today;
            this.form.returnDate = today;

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
        studentDataTable(responseData) {
            $("#studentsDataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "id", width: 25, visible: false, isPrimaryKey: true,  },
                    {field: "studentIdentifier", headerText: "Student ID",  width: 80},
                    {field: "studentName", headerText: "Student",  width: 80},
                    { field: "isPresent", headerText: "Is Present", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: "boolean", width: 75 },
                ],
            });
        },
        teachersDataTable(responseData) {
            $("#teachersDataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                editSettings: {
                    allowEditing: false,
                    allowAdding: true,
                    allowDeleting: true,
                    showDeleteConfirmDialog: true
                },
                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search]
                },
                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    {field: "teacherId", headerText: "Teacher", editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "teacherName", dataSource: this.teachers, width: 200}
                ],
                teachersDataTable(data) {
                    $("#teachersDataTable").ejGrid({
                        dataSource: data,
                        allowPaging: true,
                        allowSorting: true,
                        isResponsive: true,

                        editSettings: {
                            allowAdding: true,
                            allowDeleting: true,
                            showDeleteConfirmDialog: true
                        },

                        toolbarSettings: {
                            showToolbar: true,
                            toolbarItems: [
                                ej.Grid.ToolBarItems.Add,
                                ej.Grid.ToolBarItems.Delete,
                                ej.Grid.ToolBarItems.Cancel,
                                ej.Grid.ToolBarItems.Search
                            ]
                        },

                        columns: [
                            { field: "id", visible: false, isPrimaryKey: true },
                            {
                                field: "teacherId",
                                headerText: "Teacher",
                                editType: ej.Grid.EditingType.Dropdown,
                                foreignKeyField: "id",
                                foreignKeyValue: "name",
                                dataSource: this.teachers,
                                width: 200
                            }
                        ],
                        actionBegin: args => {
                            if (args.requestType === "save" && !args.data.id) {
                                args.data.id = this.uuid();
                            }
                        }
                    });
                }

            });
        },
        uuid() {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        loadStudentsByClass(classId) {
            const classStudents = this.students
                .filter(s => s.classId === classId)
                .map(s => ({
                    id: this.uuid(), 
                    studentId: s.id,
                    studentName: s.name,
                    isPresent: true,
                    studentIdentifier: s.studentIdentifier,
                }));
            
            this.form.students = classStudents;
            this.refreshStudentGrid(classStudents);
        },
        refreshStudentGrid(data) {

            const grid = $("#studentDataTable").data("ejGrid");

            if (grid) {
                grid.option("dataSource", data);
                grid.refreshContent();
            } else {
                this.studentDataTable(data);
            }
        },
        saveExcursion() {
            const grid = $("#teachersDataTable").ejGrid("instance");
            const records = grid.model.dataSource;

            if (!records.length) {
                this.toastHandler('warning', 'Please add at least one official');
                return;
            }
            const payload = {
                id: this.form.id,
                tenantId: this.form.tenantId,
                departureDate: this.form.departureDate,
                departureTime: this.form.departureTime,
                returnDate: this.form.returnDate,
                returnTime: this.form.returnTime,
                point: this.form.point,
                destination: this.form.destination,
                academicYearId: this.form.academicYearId,
                academicYearName: this.form.academicYearName,
                termId: this.form.termId,
                termName: this.form.termName,
                classId: this.form.classId,
                className: this.form.className,
                students: this.form.students,
                teachers: records.map(r => {
                    const teacher = this.teachers.find(s => s.id === r.teacherId);

                    return {
                        id: this.uuid(),
                        teacherId: r.teacherId,
                        teacherName: teacher ? teacher.teacherName : null,
                    };
                })
            };

            const url = this.isEditMode
                ? '/SmDataEntry/UpdateExcursion'
                : '/SmDataEntry/CreateExcursion';

            axios.post(url, payload)
                .then(() => {
                    toastr.success(this.isEditMode ? 'Excursion updated successfully' : 'Excursion created successfully');
                    this.resetForm();
                    this.loadExcursions();
                })
                .catch(() => {
                    toastr.error('Failed to save excursion');
                });
        },

        editExcursion(excursion) {
            this.isEditMode = true;

            this.form = {
                id: excursion.id,
                tenantId: excursion.tenantId,
                departureDate: excursion.departureDate?.split('T')[0],
                departureTime: excursion.departureTime,
                returnDate: excursion.returnDate?.split('T')[0],
                returnTime: excursion.returnTime,
                point: excursion.point,
                destination: excursion.destination,
                academicYearId: excursion.academicYearId,
                academicYearName: excursion.academicYearName,
                termId: excursion.termId,
                termName: excursion.termName,
                classId: excursion.classId,
                className: excursion.className,
                students: excursion.students || [],
                teachers: excursion.teachers || [],
            };

            // Populate dropdowns
            $('#academicYearId').ejDropDownList('option', 'value', excursion.academicYearId);
            $('#termId').ejDropDownList('option', 'value', excursion.termId);
            $('#classId').ejDropDownList('option', 'value', excursion.classId);

            // Populate grids
            this.studentDataTable(this.form.students);
            this.teachersDataTable(this.form.teachers);
        },

        deleteExcursion(id) {
            axios.post('/SmDataEntry/DeleteExcursion?id=' + id)
                .then(() => {
                    toastr.success('Excursion deleted');
                    this.loadExcursions();
                })
                .catch(() => {
                    toastr.error('Failed to delete excursion');
                });
        },
        resetForm() {

            this.isEditMode = false;

            this.form = {
                id: null,
                departureDate: new Date().toISOString().substr(0, 10),
                departureTime: null,
                returnDate: new Date().toISOString().substr(0, 10),
                returnTime: null,
                point: '',
                destination: '',
                academicYearId: null,
                academicYearName: '',
                termId: null,
                termName: '',
                classId: null,
                className: '',
                students: [],
                teachers: []
            };
            this.teachersDataTable([]);
        },
        
    },

});
app.mount('#app');