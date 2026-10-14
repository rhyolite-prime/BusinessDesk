const app = Vue.createApp({
    data() {
        return {
            isEditMode: false,
            loading: false,

            form: {
                classId: null,
                className: '',
                date: new Date().toISOString().substr(0, 10),
                tenantId: null,
                students: []
            },

            classes: [],
            students: [],
            attendances: [],
            mainClasses: [],
            streams: [],
            isLoading: false,
        }
    },
    mounted() {
        this.loadDropdowns();
    },
    methods: {
        printPreview() {
            if (!this.form.classId) {
                toastr.warning("Please select a class first");
                return;
            }

            const currentDate = new Date().toLocaleDateString();
            const students = this.form.students || [];

            if (!students.length) {
                toastr.warning("No students to print");
                return;
            }

            let html = `
<html>
<head>
    <title>Class Attendance</title>
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
        <h3>Class Attendance</h3>
        <div>Class: ${this.form.className}</div>
        <div>Date: ${this.form.date}</div>
    </div>
 <div class="content">
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
                    <td>${s.studentIdentifier}</td>
                    <td>${s.studentName}</td>
                    <td>${s.isPresent ? "Yes" : "No"}</td>
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
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmDataEntry/GetAllClassAttendances'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((classesRes, studentsRes, attendance, classes2, streams) => {
                this.classes = classesRes.data;

                this.students = studentsRes.data.map(s => ({
                    id: s.id,
                    name: s.firstName + ' ' + s.lastName,
                    classId: s.classId,
                    studentIdentifier: s.studentIdentifier
                }));
                this.streams = streams.data;
                this.mainClasses = classes2.data;
                this.attendances = attendance.data;
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
                }

            });
            this.form.date = new Date().toISOString().substr(0, 10);
        },
        setClassName() {
            const s = this.classes.find(x => x.id === this.form.classId);
            this.form.className = s ? s.name : '';
        },
            loadStudentsByClass(classId) {
                // Map students to consistent camelCase properties
                const classStudents = this.students
                    .filter(s => s.classId === classId)
                    .map(s => ({
                        studentId: s.id,
                        studentName: s.name,
                        studentIdentifier: s.studentIdentifier,
                        isPresent: true // default to present
                    }));

                this.form.students = classStudents;
                this.refreshStudentGrid(classStudents);
            },

            refreshStudentGrid(data) {
                const grid = $("#studentsDataTable").data("ejGrid");

                if (grid) {
                    grid.option("dataSource", data);
                    grid.refreshContent();
                } else {
                    this.studentDataTable(data);
                }
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
                    editSettings: {
                        allowEditing: true,
                        allowAdding: true,
                        allowDeleting: true,
                        showDeleteConfirmDialog: true
                    },
                    toolbarSettings: {
                        showToolbar: true,
                        toolbarItems: [ ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search]
                    },
                    columns: [
                        { field: "studentIdentifier", headerText: "Student ID", width: 100 },
                        { field: "studentName", headerText: "Student Name", width: 150 },
                        {
                            field: "isPresent",
                            headerText: "Present",
                            displayAsCheckbox: true,
                            editType: ej.Grid.EditingType.Boolean,
                            type: "boolean",
                            width: 80
                        }
                    ],
                });
            },

        saveAttendance() {
            if (!this.form.classId) {
                toastr.warning("Please select a class");
                return;
            }

            const students = this.form.students || [];
            if (!students.length) {
                toastr.warning("No students to save");
                return;
            }

            this.isLoading = true;

            const requests = students.map(s => {
                const existing = this.attendances.find(a =>
                    a.classId === this.form.classId &&
                    a.date.substr(0,10) === this.form.date &&
                    a.studentId === s.studentId
                );

                const payload = {
                    id: existing ? existing.id : null,
                    classId: this.form.classId,
                    className: this.form.className,
                    date: this.form.date,
                    tenantId: this.form.tenantId,
                    studentId: s.studentId,
                    studentIdentifier: s.studentIdentifier,
                    studentName: s.studentName,
                    isPresent: s.isPresent
                };

               
                if (existing && existing.id) {
                    return axios.put('/SmDataEntry/UpdateClassAttendance', payload);
                } else {
                    return axios.post('/SmDataEntry/CreateClassAttendance', payload);
                    
                }
            });

            Promise.all(requests)
                .then(() => {
                    toastr.success("Attendance saved successfully for all students");
                    this.isLoading = false;
                    this.form.students.forEach(s => {
                        const existing = this.attendances.find(a => a.studentId === s.studentId && a.date.substr(0,10) === this.form.date);
                        if (existing) {
                            existing.isPresent = s.isPresent;
                            existing.studentName = s.studentName;
                            existing.studentIdentifier = s.studentIdentifier;
                        } else {
                            this.attendances.push({...s, classId: this.form.classId, className: this.form.className, date: this.form.date, tenantId: this.form.tenantId, id: null});
                        }
                    });

                })
                .catch(err => {
                    console.error(err);
                    toastr.error("Failed to save attendance for one or more students");
                    this.isLoading = false;
                });
        },

        loadAttendanceOrStudents(classId, date) {
            this.isEditMode = false;
            const formattedDate = new Date(date).toISOString().substr(0, 10);

            // Filter the loaded attendances
            const existing = this.attendances.filter(a =>
                a.classId === classId && a.date.substr(0, 10) === formattedDate
            );

            if (existing.length) {
                // Attendance exists → load it into the table
                this.isEditMode = true;
                this.form.students = existing.map(a => ({
                    studentId: a.studentId,
                    studentName: a.studentName,
                    studentIdentifier: a.studentIdentifier,
                    isPresent: a.isPresent
                }));
            } else {
                // No attendance yet → load students fresh
                this.loadStudentsByClass(classId);
            }

            this.refreshStudentGrid(this.form.students);
        }
        },
    watch: {
        'form.classId'(newClassId) {
            if (newClassId && this.form.date) {
                this.loadAttendanceOrStudents(newClassId, this.form.date);
            }
        },
        'form.date'(newDate) {
            if (newDate && this.form.classId) {
                this.loadAttendanceOrStudents(this.form.classId, newDate);
            }
        }
    }
});
app.mount('#app');