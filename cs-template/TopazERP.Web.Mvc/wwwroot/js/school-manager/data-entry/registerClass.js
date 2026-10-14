const app = Vue.createApp({
    data() {
        return {
            showListPanel: true,
            isEditMode: false,
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            form: {
                id: null,
                classId: null,
                academicYearId: null,
                roomId: null,
                mainTeacherId: null,
                subTeacherId: null,
                classPrefectId: null,
                assistantPrefectId: null,
                capacity: null,
                description: '',
                comments: ''
            },
            teachers: [],
            classes: [],
            academicYears: [],
            rooms: [],
            registeredClasses: [],
            expandedYears: {},
            searchText: '',
            sortKey: 'academicYearName',
            sortAsc: true,

            currentPage: 1,
            pageSize: 10,
            students: [],
            teacherClasses: [],
            filteredTeachers: [],
            filteredStudents: [],
        }
    },
    computed: {
        filteredAndSortedClasses() {
            let list = [...this.registeredClasses];

            // SEARCH
            if (this.searchText) {
                const q = this.searchText.toLowerCase();
                list = list.filter(x =>
                    (x.className && x.className.toLowerCase().includes(q)) ||
                    (x.academicYearName && x.academicYearName.toLowerCase().includes(q)) ||
                    (x.roomName && x.roomName.toLowerCase().includes(q)) ||
                    (x.mainTeacherName && x.mainTeacherName.toLowerCase().includes(q))
                );
            }

            // SORT
            list.sort((a, b) => {
                let valA = a[this.sortKey] ?? '';
                let valB = b[this.sortKey] ?? '';

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return this.sortAsc ? -1 : 1;
                if (valA > valB) return this.sortAsc ? 1 : -1;
                return 0;
            });

            return list;
        },
        pagedClasses() {
            const start = (this.currentPage - 1) * this.pageSize;
            return this.filteredAndSortedClasses.slice(start, start + this.pageSize);
        },

        totalPages() {
            return Math.ceil(this.filteredAndSortedClasses.length / this.pageSize);
        },
        groupedByAcademicYear() {
            const groups = {};

            this.pagedClasses.forEach(item => {
                if (!groups[item.academicYearId]) {
                    groups[item.academicYearId] = {
                        academicYearId: item.academicYearId,
                        academicYearName: item.academicYearName,
                        classes: []
                    };
                }
                groups[item.academicYearId].classes.push(item);
            });

            return Object.values(groups);
        },
        groupedAllByAcademicYear() {
            const groups = {};

            this.registeredClasses.forEach(item => {
                if (!groups[item.academicYearId]) {
                    groups[item.academicYearId] = {
                        academicYearName: item.academicYearName,
                        classes: []
                    };
                }
                groups[item.academicYearId].classes.push(item);
            });

            return Object.values(groups);
        },
        visiblePages() {

            const pages = [];

            // if pages are 3 or less show all
            if (this.totalPages <= 3) {

                for (let i = 1; i <= this.totalPages; i++) {
                    pages.push(i);
                }

                return pages;
            }

            // always show first page
            pages.push(1);

            // show dots before current range
            if (this.currentPage > 3) {
                pages.push('...');
            }

            // middle pages
            let start = Math.max(2, this.currentPage - 1);
            let end = Math.min(this.totalPages - 1, this.currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // show dots after current range
            if (this.currentPage < this.totalPages - 2) {
                pages.push('...');
            }

            // always show last page
            pages.push(this.totalPages);

            return [...new Set(pages)];
        },
    },
    methods: {
        printPreview() {
            const currentDate = new Date().toLocaleDateString();
            let html = `
        <html>
        <head>
            <title>Registered Classes</title>
            <style>
                   body { font-family: "Times New Roman"; }
        h3, h4 { text-align: center; margin: 5px 0; text-decoration: underline; }

        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 80px;
            text-align: center;
            z-index: 999;
        }

        .content {
            margin-top: 90px; 
            margin-bottom: 60px;
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

            .content { page-break-inside: avoid; }

            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }

            .page-break { page-break-before: always; 
            margin-bottom: 60px; }
        }
        </style>
        </head>
        <body>

      
        `;

            this.groupedAllByAcademicYear.forEach(year => {
                html += `
            
                <h3>Registered Classes For Academic Year: ${year.academicYearName}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Room</th>
                            <th>Main Teacher</th>
                            <th>Assistant Teacher</th>
                            <th>Prefect</th>
                            <th>Assistant Prefect</th>
                            <th>Capacity</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

                year.classes.forEach(c => {
                    html += `
        <tr>
            <td>${this.getLevelClassNameFromId(c.classId)}</td>
            <td>${this.getRoomName(c.roomId)}</td>
            <td>${this.getTeacherName(c.mainTeacherId)}</td>
            <td>${this.getTeacherName(c.subTeacherId)}</td>
            <td>${this.getStudentName(c.classPrefectId)}</td>
            <td>${this.getStudentName(c.assistantPrefectId)}</td>
            <td>${c.capacity || ''}</td>
        </tr>
    `;
                });


                html += `
                    </tbody>
                </table>
                <div class="page-break"></div>
            `;
            });

            html += `
  <div class="footer">
                <div class="right">Printed On - ${currentDate}</div>
                 <div class="center">Topaz School Manager</div>
                <div class="left">Page 1</div>
        </body>
        </html>
        `;
            
            const printWindow = window.open('', '', 'width=900,height=600');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        },
        toggleYear(yearId) {
           /* this.$set(
                this.expandedYears,
                yearId,
                !this.expandedYears[yearId]
            );*/
            this.expandedYears[yearId] = !this.expandedYears[yearId];
        },
        setSort(key) {
            if (this.sortKey === key) {
                this.sortAsc = !this.sortAsc;
            } else {
                this.sortKey = key;
                this.sortAsc = true;
            }
        },
        sortIcon(key) {
            if (this.sortKey !== key) return 'la la-sort';
            return this.sortAsc ? 'la la-sort-up' : 'la la-sort-down';
        },
        GetRegisteredClass() {
            axios.get('/SmDataEntry/GetAllRegisteredClasses/')
                .then(res => {
                    this.registeredClasses = res.data;
                    this.currentPage = 1;

                  
                    this.expandedYears = {};
                    this.registeredClasses.forEach(item => {
                        /*this.$set(this.expandedYears, item.academicYearId, true);*/
                        this.expandedYears[item.academicYearId] = true;
                    });
                })
                .catch(() => this.toastHandler('error', 'Unable to get registered classes.'));
        },
        loadDropdowns() {
            axios.all([
                axios.get('/SmStaffSetups/ListAllStaffBios'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllClassrooms/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmStaffSetups/ListAllTeacherClasses')
            ]).then(axios.spread((
                teachers, levelClasses, mainClasses, streams, years, rooms, students, teacherClasses
            ) => {

                this.teachers = teachers.data.filter(x => x.isTeacher);

                this.teachers.forEach(t => {
                    t.name = [t.firstName, t.lastName]
                        .filter(x => x)
                        .join(' ');
                });

                this.students = students.data;
                this.students.forEach(s => s.name = s.firstName + ' ' + s.lastName);

                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.classes = levelClasses.data
                    .map(c => ({
                        ...c,
                        name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));
            
                this.academicYears = years.data;
                this.rooms = rooms.data;
                this.teacherClasses = teacherClasses.data;

                this.initDropdowns();

            })).catch(() => this.toastHandler('error', 'Unable to load dropdown data.'));
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
        getRoomName(roomId) {
            return this.rooms.find(r => r.id === roomId)?.name || '';
        },
        getTeacherName(staffId) {
            return this.teachers.find(t => t.id === staffId)?.name || '';
        },
        getStudentName(studentId) {
           return this.students.find(s => s.id === studentId)?.name || ''; 
        },
        getAcademicYearName(academicYearId) {
            return this.academicYears.find(y => y.id === academicYearId)?.name || '';
        },
        teacherByClass(classId) {
            if (!classId) {
                this.filteredTeachers = [];
                return;
            }
            const staffIdsForClass = this.teacherClasses
                .filter(tc => tc.classId === classId)
                .map(tc => tc.staffId);
            this.filteredTeachers = this.teachers.filter(t => staffIdsForClass.includes(t.id));
        },

        studentsByClass(classId) {
            if (!classId) {
                this.filteredStudents = [];
                return;
            }
            this.filteredStudents = this.students.filter(s => s.classId === classId);
        },



        initDropdowns() {

            $('#classId').ejDropDownList({
                dataSource: this.classes.map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                })),
                width: "100%",
                watermarkText: "Select Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.classId = args.value;

                    // Update reactive arrays
                    this.teacherByClass(args.value);
                    this.studentsByClass(args.value);

                    // Refresh dependent dropdowns
                    $('#mainTeacherId').ejDropDownList('option', 'dataSource', this.filteredTeachers);
                    $('#subTeacherId').ejDropDownList('option', 'dataSource', this.filteredTeachers);
                    $('#classPrefectId').ejDropDownList('option', 'dataSource', this.filteredStudents);
                    $('#assistantPrefectId').ejDropDownList('option', 'dataSource', this.filteredStudents);

                    // Optional: clear previous selections
                    $('#mainTeacherId').ejDropDownList('clearText');
                    $('#subTeacherId').ejDropDownList('clearText');
                    $('#classPrefectId').ejDropDownList('clearText');
                    $('#assistantPrefectId').ejDropDownList('clearText');

                    this.setClassName(); // ✅ Set reactive class name
                }
            });


            $('#roomId').ejDropDownList({
                dataSource: this.rooms,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.roomId = args.value
                
            });
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
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.form.academicYearId = activeYear.id;
                this.form.academicYearName = activeYear.name;
            }
            $('#mainTeacherId').ejDropDownList({
                dataSource: this.filteredTeachers,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.mainTeacherId = args.value
            });

            $('#subTeacherId').ejDropDownList({
                dataSource: this.filteredTeachers,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.subTeacherId = args.value
            });

            $('#classPrefectId').ejDropDownList({
                dataSource: this.filteredStudents,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.classPrefectId = args.value
            });

            $('#assistantPrefectId').ejDropDownList({
                dataSource: this.filteredStudents,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.assistantPrefectId = args.value
            });

        },


        setTeacherName() {
            const selected = this.teachers.find(x => x.id === this.form.mainTeacherId);
            this.form.mainTeacherName = selected ? selected.name : '';
            const subSelected = this.teachers.find(x => x.id === this.form.subTeacherId);
            this.form.subTeacherName = subSelected ? subSelected.name : '';
        },
        setStudentName() {
            const prefectSelected = this.students.find(x => x.id === this.form.classPrefectId);
            this.form.classPrefectName = prefectSelected ? prefectSelected.name : '';
            const assistantSelected = this.students.find(x => x.id === this.form.assistantPrefectId);
            this.form.assistantPrefectName = assistantSelected ? assistantSelected.name : '';
        },
        setClassName() {
            this.form.className = this.getLevelClassNameFromId(this.form.classId);
        },
        
        setAcademicYearName() {
            const selected = this.academicYears.find(x => x.id === this.form.academicYearId);
            this.form.academicYearName = selected ? selected.name : '';
        },

        setRoomName() {
            const selected = this.rooms.find(x => x.id === this.form.roomId);
            this.form.roomName = selected ? selected.name : '';
        },

        saveInput() {

            this.setAcademicYearName();
            this.setRoomName();
            this.setClassName();
            this.setTeacherName();
            this.setStudentName();

            const duplicate = this.registeredClasses.find(x =>
                x.academicYearId === this.form.academicYearId &&
                x.classId === this.form.classId &&
                x.id !== this.form.id
            );

            if (duplicate) {
                this.toastHandler('error', 'This class is already registered for the selected academic year.');
                return;
            }

            // create clean payload
            const payload = {

                // ONLY send id during editing
                ...(this.isEditMode && { id: this.form.id }),

                classId: this.form.classId,
                academicYearId: this.form.academicYearId,

                roomId: this.form.roomId || this.emptyGuid,
                mainTeacherId: this.form.mainTeacherId || this.emptyGuid,
                subTeacherId: this.form.subTeacherId || this.emptyGuid,
                classPrefectId: this.form.classPrefectId || this.emptyGuid,
                assistantPrefectId: this.form.assistantPrefectId || this.emptyGuid,

                capacity: this.form.capacity,
                description: this.form.description,
                comments: this.form.comments,

                className: this.form.className,
                academicYearName: this.form.academicYearName,
                roomName: this.form.roomName,

                mainTeacherName: this.form.mainTeacherName,
                subTeacherName: this.form.subTeacherName,

                classPrefectName: this.form.classPrefectName,
                assistantPrefectName: this.form.assistantPrefectName
            };

            if (this.isEditMode) {

                axios.post('/SmDataEntry/UpdateRegisteredClass/', payload)
                    .then(() => {

                        this.toastHandler('', 'Data updated successfully.');

                        this.GetRegisteredClass();

                        this.resetForm();

                    })
                    .catch(() => {

                        this.toastHandler('error', 'Unable to update record.');

                    });

            } else {

                axios.post('/SmDataEntry/CreateRegisteredClass/', payload)
                    .then(() => {

                        this.toastHandler('', 'Data saved successfully.');

                        this.GetRegisteredClass();

                        this.resetForm();

                    })
                    .catch(() => {

                        this.toastHandler('error', 'Unable to save data.');

                    });

            }
        },

        editRegisteredClass(item) {
            this.isEditMode = true;
            this.showListPanel = false;

            this.form = { ...item };

            $('#classId').ejDropDownList('option', 'value', item.classId);
            $('#academicYearId').ejDropDownList('option', 'value', item.academicYearId);
            $('#roomId').ejDropDownList('option', 'value', item.roomId);
            $('#mainTeacherId').ejDropDownList('option', 'value', item.mainTeacherId);
            $('#subTeacherId').ejDropDownList('option', 'value', item.subTeacherId);
            $('#classPrefectId').ejDropDownList('option', 'value', item.classPrefectId);
            $('#assistantPrefectId').ejDropDownList('option', 'value', item.assistantPrefectId);
        },


        deleteRegisteredClass(id) {
            axios.delete('/SmDataEntry/DeleteRegisteredClass', {
                params: { id }
            })
                .then(() => {
                    this.toastHandler('', 'Deleted successfully.');
                    this.GetRegisteredClass();
                })
                .catch(() => {
                    this.toastHandler('error', 'Unable to delete record.');
                });
        },

        toastHandler(type, message) {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                timeOut: 4000
            };
            type === 'error' ? toastr.error(message) : toastr.success(message);
        },

        resetForm() {
            this.isEditMode = false;
            this.form = { id: null };

            $('#classId').ejDropDownList('clearText');
            $('#academicYearId').ejDropDownList('clearText');
            $('#roomId').ejDropDownList('clearText');
            $('#mainTeacherId').ejDropDownList('clearText');
            $('#subTeacherId').ejDropDownList('clearText');
            $('#classPrefectId').ejDropDownList('clearText');
            $('#assistantPrefectId').ejDropDownList('clearText');
        },


    },

    mounted() {
        this.loadDropdowns();
        this.GetRegisteredClass();
    }
});
app.mount('#app');
