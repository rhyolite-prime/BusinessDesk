const app = Vue.createApp({

    data() {
        return {

            isLoading: false,
            classes: [],
            mainClasses: [],
            streams: [],
            students: [],
            studentId: '',
            classId: '',
            levelClassDropdown:[],
            selectedClass: '',
            classStudents:[],
            searchTerm: '',
            currentPage: 1,
            pageSize: 10,
            selectedStudents: [],
            smsMessage: '',
            sortColumn: 'name',
            sortDirection: 'asc',
        };
    },
    computed: {
        filteredStudents() {

            let result = this.classStudents;
           
            // Search
            if (this.searchTerm.trim()) {

                const search =
                    this.searchTerm
                        .toLowerCase()
                        .trim();

                result = result.filter(student =>

                    student.studentIdentifier
                        .toLowerCase()
                        .includes(search)

                    ||

                    student.name
                        .toLowerCase()
                        .includes(search)

                    ||

                    student.phoneNumber
                        .toLowerCase()
                        .includes(search)

                );

            }
            // ==========================
            // SORT
            // ==========================

            result = [...result].sort((a, b) => {

                let valueA;
                let valueB;


                if (this.sortColumn === 'status') {

                    valueA = a.phoneNumber
                        ? 'available'
                        : 'unavailable';

                    valueB = b.phoneNumber
                        ? 'available'
                        : 'unavailable';

                } else {

                    valueA = a[this.sortColumn];
                    valueB = b[this.sortColumn];

                }


                valueA = String(valueA || '').toLowerCase();
                valueB = String(valueB || '').toLowerCase();


                if (valueA < valueB) {

                    return this.sortDirection === 'asc'
                        ? -1
                        : 1;

                }


                if (valueA > valueB) {

                    return this.sortDirection === 'asc'
                        ? 1
                        : -1;

                }


                return 0;

            });
            return result;

        },
        totalPages() {

            return Math.max(
                1,
                Math.ceil(
                    this.filteredStudents.length /
                    this.pageSize
                )
            );

        },
        paginatedStudents() {

            const start =
                (this.currentPage - 1) *
                this.pageSize;

            const end =
                start + this.pageSize;

            return this.filteredStudents.slice(
                start,
                end
            );

        },
        paginationPages() {

    const total = this.totalPages;
    const current = this.currentPage;

    // If there are only a few pages,
    // show all of them.
    if (total <= 7) {

        return Array.from(
            { length: total },
            (_, index) => index + 1
        );

    }


    const pages = [];


    // Always show first page
    pages.push(1);


    /*
     * Near the beginning
     *
     * 1 2 3 4 5 ... 20
     */
    if (current <= 4) {

        pages.push(2);
        pages.push(3);
        pages.push(4);
        pages.push(5);
        pages.push('...');
        pages.push(total);

        return pages;

    }


    /*
     * Near the end
     *
     * 1 ... 16 17 18 19 20
     */
    if (current >= total - 3) {

        pages.push('...');

        pages.push(total - 4);
        pages.push(total - 3);
        pages.push(total - 2);
        pages.push(total - 1);
        pages.push(total);

        return pages;

    }


    /*
     * Somewhere in the middle
     *
     * 1 ... 8 9 10 11 12 ... 20
     */
    pages.push('...');

    pages.push(current - 2);
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push(current + 2);

    pages.push('...');

    pages.push(total);


    return pages;

},


        paginationStart() {

            if (!this.filteredStudents.length) {
                return 0;
            }

            return (
                (this.currentPage - 1) *
                this.pageSize
            ) + 1;

        },
        paginationEnd() {

            return Math.min(
                this.currentPage * this.pageSize,
                this.filteredStudents.length
            );

        },
        allCurrentPageSelected() {

            if (!this.filteredStudents.length) {
                return false;
            }

            return this.filteredStudents.every(
                student =>
                    this.selectedStudents.includes(
                        student.id
                    )
            );

        }

    },
    watch: {
        searchTerm() {

            this.currentPage = 1;

        },

        classId(newVal) {
            this.getClassStudents();
        },

    },


    /* =====================================================
       METHODS
       ===================================================== */

    methods: {
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),

            ]).then(axios.spread((classes, mainClasses, streams, students) => {
                
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                
                this.students = students.data.filter(s => !s.isAlumni);
                this.students.forEach(s => {
                    s.name = this.formatStudentName(s);
                    s.displayText = `${s.studentIdentifier}, ${s.name}`;
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.initDropdowns();
            }));
        },
        getClassStudents() {
            this.classStudents = this.students.filter(s => s.classId === this.classId);
            this.classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));

            return this.classStudents;
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
      

        initDropdowns() {
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id, // levelClassId
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.levelClassDropdown = levelClassDropdown;
        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        toastHandler(
            type,
            message = 'An unexpected error occurred.'
        ) {

            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000
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


        /*
         * Class changed
         */
        changeClass() {

            this.currentPage = 1;

            this.selectedStudents = [];

        },


        /*
         * Select all on current page
         */
        toggleSelectAll(event) {

            const ids =
                this.filteredStudents.map(
                    student => student.id
                );


            if (event.target.checked) {

                ids.forEach(id => {

                    if (!this.selectedStudents.includes(id)) {

                        this.selectedStudents.push(id);

                    }

                });

            } else {

                this.selectedStudents =
                    this.selectedStudents.filter(
                        id => !ids.includes(id)
                    );

            }

        },


        /*
         * Check if student is selected
         */
        isStudentSelected(studentId) {

            return this.selectedStudents.includes(
                studentId
            );

        },


        /*
         * Clear all selected students
         */
        clearSelection() {

            this.selectedStudents = [];

        },


        /*
         * Pagination
         */
        changePage(page) {

            if (
                page < 1 ||
                page > this.totalPages
            ) {
                return;
            }

            this.currentPage = page;

        },

        sortTable(column) {

            /*
             * Clicking the same column
             * toggles ASC / DESC.
             */

            if (this.sortColumn === column) {

                this.sortDirection =
                    this.sortDirection === 'asc'
                        ? 'desc'
                        : 'asc';

            }

            /*
             * Clicking a new column
             * starts with ASC.
             */

            else {

                this.sortColumn = column;

                this.sortDirection = 'asc';

            }

            this.currentPage = 1;

        },
        /*
         * Get student initials
         */
        getInitials(name) {

            if (!name) {
                return '';

            }

            return name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(
                    word =>
                        word
                            .charAt(0)
                            .toUpperCase()
                )
                .join('');

        },


        /*
         * Send SMS
         */
        sendSms() {

            if (!this.selectedStudents.length) {

                this.toastHandler(
                    'warning',
                    'Please select at least one student.'
                );

                return;

            }


            if (!this.smsMessage.trim()) {

                this.toastHandler(
                    'warning',
                    'Please enter your SMS message.'
                );

                return;

            }
            

            const recipients =
                this.students.filter(
                    student =>
                        this.selectedStudents.includes(
                            student.id
                        )
                );


            console.log(
                'SMS Message:',
                this.smsMessage
            );

            console.log(
                'Recipients:',
                recipients
            );


            this.toastHandler(
                'success',
                `${recipients.length} student parent(s) selected for SMS.`
            );

        }

    },
    mounted() {
        this.loadDropdowns();
    }

});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');

