const app = Vue.createApp({
    data() {
        return {
            studentList: [],
            searchQuery: '',
            sortKey: '',
            sortAsc: true,
            currentPage: 1,
            perPage: 25,
            classes: [],
            mainClasses: [],
            streams: [],
            studentToDeleteId: null,
            studentToDeleteName: '',
            selectedStudent: null,
            showStudentModal: false,
            countries: [],
            religions: [],
            cities: [],
            academicYears: [],
        }
    },
    computed: {
        filteredData() {
            let data = this.studentList;

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                data = data.filter(s =>
                    (s.firstName && s.firstName.toLowerCase().includes(q)) ||
                    (s.lastName && s.lastName.toLowerCase().includes(q)) ||
                    (s.studentIdentifier && s.studentIdentifier.toLowerCase().includes(q)) ||
                    (s.indexNumber && s.indexNumber.toLowerCase().includes(q))
                );
            }

            if (this.sortKey) {
                data.sort((a, b) => {
                    const valA = a[this.sortKey] || '';
                    const valB = b[this.sortKey] || '';
                    if (this.sortAsc) return valA > valB ? 1 : -1;
                    else return valA < valB ? 1 : -1;
                });
            }

            return data;
        },
        totalPages() {
            return Math.ceil(this.filteredData.length / this.perPage);
        },
        paginatedData() {
            const start = (this.currentPage - 1) * this.perPage;
            return this.filteredData.slice(start, start + this.perPage);
        },
        visiblePages() {

            const pages = [];

            // show all if pages are small
            if (this.totalPages <= 3) {

                for (let i = 1; i <= this.totalPages; i++) {
                    pages.push(i);
                }

                return pages;
            }

            // first page
            pages.push(1);

            // left dots
            if (this.currentPage > 3) {
                pages.push('...');
            }

            // middle pages
            let start = Math.max(2, this.currentPage - 1);
            let end = Math.min(this.totalPages - 1, this.currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // right dots
            if (this.currentPage < this.totalPages - 2) {
                pages.push('...');
            }

            // last page
            pages.push(this.totalPages);

            return [...new Set(pages)];
        },
    },
    methods: {
        loadLookups() {
            return axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/JsonDataSample/countries.json'),
                axios.get('/JsonDataSample/religions.json'),
                axios.get('/SharedResource/GetCities/'),
            ]).then(axios.spread((
                levelClasses,
                mainClasses,
                streams,
                academicYears,
                countries,
                religions,
                cities,

            ) => {
                this.classes = levelClasses.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.countries = countries.data;
                this.religions = religions.data;
                this.cities = cities.data;
                this.academicYears = academicYears.data;
            }));
        },
        viewStudent(student) {
            this.selectedStudent = student;

            this.showStudentModal = true;
            console.log(this.selectedStudent);
        },
        closeStudentModal() {
            this.showStudentModal = false;
            this.selectedStudent = null;
        },


        getCountryName(countryId) {
            return this.countries.find(c => c.id === countryId)?.name || '';
        },
        getNationalityName(countryId) {
            return this.countries.find(c => c.id === countryId)?.nationality || '';
        },
        getReligionName(religionId) {
            return this.religions.find(r => r.id === religionId)?.name || '';
        },
        getCityName(cityId) {
            return this.cities.find(c => c.id === cityId)?.name || '';
        },
        getAcademicYearName(academicYearId) {
            return this.academicYears.find(a => a.id === academicYearId)?.name || '';
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getLevelClassNameFromId(levelClassId) {
            const levelClass = this.getLevelClassById(levelClassId);
            if (!levelClass) return '';

            const cls = this.getMainClassName(levelClass.classId);
            const stream = this.getStreamName(levelClass.streamId);

            return `${cls} ${stream}`.trim();
        },
        getLevelClassName(levelClass) {
            const cls = this.getMainClassName(levelClass.classId);
            const stream = this.getStreamName(levelClass.streamId);
            return `${cls} ${stream}`.trim();
        },

        getLevelClassById(levelClassId) {
            return this.classes.find(c => c.id === levelClassId);
        },
        getStudentList() {
            axios.get('/SmStudentSetups/ListAllStudents').then(res => {
                this.studentList = res.data.filter(s => s.isPreClassStudent === true);
                this.studentList.forEach(s => {
                    s.fullName = [s.lastName, s.firstName, s.otherName].filter(n => n).join(' ');
                    s.countryName = this.getCountryName(s.countryId);
                    s.religionName = this.getReligionName(s.religionId);
                    s.cityName = this.getCityName(s.cityId);
                    s.academicYearName = this.getAcademicYearName(s.academicYearId);
                    s.nationality = this.getNationalityName(s.countryId);
                });
                this.studentList.sort((a, b) => a.studentIdentifier.localeCompare(b.studentIdentifier));
            }).catch(() => {
                this.toastHandler('error', 'Unable to load student data.');
            });
        },
        deleteStudent(id, fullName) {
            this.studentToDeleteId = id;
            this.studentToDeleteName = fullName;
            const modalEl = new bootstrap.Modal(document.getElementById('deleteStudentModal'));
            modalEl.show();
        },
        /* deleteStudent(id) {
             axios.get('/SmStudentSetups/DeleteStudent?id=' + id).then(() => {
                 this.getStudentList();
                 this.toastHandler('', 'Student deleted successfully.');
             }).catch(() => this.toastHandler('error', 'Unable to delete student.'));
         },*/
        confirmDeleteStudent() {
            if (!this.studentToDeleteId) return;

            axios.get('/SmStudentSetups/DeleteStudent?id=' + this.studentToDeleteId)
                .then(() => {
                    this.getStudentList();
                    this.toastHandler('', 'Student deleted successfully.');
                })
                .catch(() => this.toastHandler('error', 'Unable to delete student.'))
                .finally(() => {
                    this.studentToDeleteId = null;
                    this.studentToDeleteName = '';
                    const modalEl = bootstrap.Modal.getInstance(document.getElementById('deleteStudentModal'));
                    modalEl.hide();
                });
        },
        sortBy(key) {
            if (this.sortKey === key) this.sortAsc = !this.sortAsc;
            else {
                this.sortKey = key;
                this.sortAsc = true;
            }
        },
        changePage(page) {
            if (page < 1 || page > this.totalPages) return;
            this.currentPage = page;
        },
        toastHandler(type, message) {
            toastr.options = { closeButton: true, progressBar: true, timeOut: 4000 };
            type === 'error' ? toastr.error(message) : toastr.success(message);
        },
        formatDate(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
    },
    mounted() {
        this.loadLookups().then(() => {
            this.getStudentList();
        });
    }
});
app.mount('#app');