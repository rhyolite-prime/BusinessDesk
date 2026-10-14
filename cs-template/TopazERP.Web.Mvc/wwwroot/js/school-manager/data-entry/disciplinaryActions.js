const app = Vue.createApp({
    data() {
        return {
            academicYears: [],
            classes: [],
            offenses: [],
            students: [],
            disciplinaryActions: [],
            saving: false,
            newRow: null,
            sortKey: '',
            sortAsc: true,
            pageSize: 10,
            currentPage: 1,
            selectedRow: null,
            searchText: '',
            mainClasses: [],
            streams: [],
        }
    },

    mounted() {
        this.loadDropdowns();
    },
    computed: {
        studentsByClass() {
            return classId => {
                return this.students.filter(s => s.classId === classId);
            };
        },
        filteredRows() {
            if (!this.searchText) return this.disciplinaryActions;

            const t = this.searchText.toLowerCase();

            return this.disciplinaryActions.filter(r =>
                (this.getStudentName(r.studentId) || '').toLowerCase().includes(t) ||
                (this.getClassName(r.classId) || '').toLowerCase().includes(t) ||
                (this.getOffenseName(r.offenseId) || '').toLowerCase().includes(t) ||
                (r.description || '').toLowerCase().includes(t)
            );
        },

        sortedRows() {
            let rows = [...this.filteredRows];

            if (this.sortKey) {
                rows.sort((a, b) => {
                    let x = a[this.sortKey] || '';
                    let y = b[this.sortKey] || '';
                    return this.sortAsc
                        ? x > y ? 1 : -1
                        : x < y ? 1 : -1;
                });
            }
            return rows;
        },

        pagedRows() {
            const start = (this.currentPage - 1) * this.pageSize;
            return this.sortedRows.slice(start, start + this.pageSize);
        },

        totalPages() {
            return Math.ceil(this.sortedRows.length / this.pageSize);
        }
    },

    methods: {
        getStudentName(id) {
            const s = this.students.find(x => x.id === id);
            return s ? s.name : '';
        },

        getClassName(id) {
            const c = this.classes.find(x => x.id === id);
            return c ? c.name : '';
        },

        getOffenseName(id) {
            const o = this.offenses.find(x => x.id === id);
            return o ? o.name : '';
        },

        selectRow(row) {
            this.selectedRow = row;
        },

        saveSelected() {
            if (!this.selectedRow) {
                toastr.warning('Please select a row first');
                return;
            }
            this.saveRow(this.selectedRow);
        },
        deleteSelected() {
            if (!this.selectedRow || !this.selectedRow.id) {
                toastr.warning('No row selected');
                return;
            }
            this.deleteRow(this.selectedRow.id);
        },

        sortBy(key) {
            this.sortAsc = this.sortKey === key ? !this.sortAsc : true;
            this.sortKey = key;
        },
        addRow() {
            this.disciplinaryActions.unshift({
                id: null,
                academicYearId: null,
                classId: null,
                studentId: null,
                offenseId: null,
                actionDate: this.formatDate(new Date()),
                description: ''
            });
        },
        /* ===========================
           LOAD DROPDOWNS + DATA
        ============================ */
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses'),
                axios.get('/SmMainSetups/ListAllOffences/'),
                axios.get('/SmStudentSetups/ListAllStudents'),
                axios.get('/SmDataEntry/GetAllDisciplinaryActions/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((years, classes, offenses, students, actions, mainClasses, streams) => {
                this.academicYears = years.data;
                this.classes = classes.data;
                this.offenses = offenses.data;
                this.students = students.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                // set student name
                this.students.forEach(s => {
                    s.name = [s.firstName, s.otherName, s.lastName].filter(Boolean).join(' ');
                });

                this.disciplinaryActions = actions.data;
                // format dates
                this.disciplinaryActions.forEach(a => {
                    a.actionDate = this.formatDate(a.actionDate);
                });
                
               
                
            })).catch(() => {
                this.toastHandler('error', 'Unable to load data.');
            });
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getLevelClassName(levelClass) {
            return `${this.getMainClassName(levelClass.classId)} ${this.getStreamName(levelClass.streamId)}`.trim();
        },
        getLevelClassNameFromId(levelClassId) {
            const levelClass = this.classes.find(c => c.id === levelClassId);
            return levelClass ? this.getLevelClassName(levelClass) : '';
        },
        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },
        saveRow(row) {
            const student = this.students.find(s => s.id === row.studentId);
            if (student && student.classId !== row.classId) {
                this.toastHandler('error', 'Student does not belong to selected class.');
                return;
            }
            //save names
            row.studentName = this.getStudentName(row.studentId);
            row.className = this.getClassName(row.classId);
            row.offenseName = this.getOffenseName(row.offenseId);
            row.academicYearName = this.academicYears.find(y => y.id === row.academicYearId).name;
          

            const api = row.id
                ? '/SmDataEntry/UpdateDisciplinaryAction'
                : '/SmDataEntry/CreateDisciplinaryAction';

            axios.post(api, row)
                .then(() => {
                    this.toastHandler('', 'Saved successfully');
                    this.loadDropdowns();
                })
                .catch(() => {
                    this.toastHandler('error', 'Save failed');
                });
        },

        deleteRow(id) {
            if (!id) return;

            axios.get(`/SmDataEntry/DeleteDisciplinaryAction?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Deleted');
                    this.loadDropdowns();
                });
        },
        
        printPreview() {
            if (!this.disciplinaryActions || this.disciplinaryActions.length === 0) {
                this.toastHandler('warning', 'No data to print.');
                return;
            }

            const currentDate = new Date().toLocaleDateString();

            // Build HTML
            let printHtml = `
        <html>
        <head>
            <title>Disciplinary Actions Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h4 { text-align: center; margin-bottom: 20px;  }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
                th { background-color: #f2f2f2; }

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
            <h4>Disciplinary Actions Report</h4>
            <table>
                <thead>
                    <tr>
                        <th>Academic Year</th>
                        <th>Class</th>
                        <th>Student</th>
                        <th>Offense</th>
                        <th>Date</th>
                        <th>Action Taken</th>
                    </tr>
                </thead>
                <tbody>
    `;

            this.disciplinaryActions.forEach(a => {
                printHtml += `
            <tr>
                <td>${a.academicYearName || ''}</td>
                <td>${this.getLevelClassNameFromId(a.classId)}</td>
                <td>${this.getStudentName(a.studentId)}</td>
                <td>${a.offenseName || ''}</td>
                <td>${a.actionDate || ''}</td>
                <td>${a.description || ''}</td>
            </tr>
        `;
            });

            printHtml += `
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
            printWindow.document.write(printHtml);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        },

        /* ===========================
           TOAST
        ============================ */
        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = { closeButton: true, progressBar: true, timeOut: 10000 };
            switch (type) {
                case 'error': toastr.error('', message); break;
                case 'warning': toastr.warning('', message); break;
                default: toastr.success('', message); break;
            }
        }
    }
});
app.mount('#app');