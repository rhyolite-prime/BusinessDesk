const app = Vue.createApp({
    data() {
        return {
            form: {
                studentIdentifier: '',
                dateOfBirth: '',
                admissionDate: '',
                balanceDueDate: '',
                isPreClassStudent: true,
                balanceDue: 0
            },

            countries: [],
            cities: [],
            religions: [],
            locations: [],
            classes: [],
            academicYears: [],
            statuses: [],
            hostels: [],
            houses: [],
            studentId: '',
            bioSaved: false,
            mainClasses: [],
            streams: [],
            errors: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
        }
    },

    methods: {

        loadDropdowns() {

            axios.all([
                axios.get(`/jsonDataSample/countries.json?v=${new Date().getTime()}`),
                axios.get('/SharedResource/GetCities'),
                axios.get(`/jsonDataSample/religions.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllLocations'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get(`/jsonDataSample/studentStatuses.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllHostels/'),
                axios.get('/SmStudentSetups/ListAllHouses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((
                countries, cities, religions, locations, classes, years, statuses, hostels,houses,mainClasses,streams
            ) => {

                this.countries = countries.data;
                this.cities = cities.data;
                this.religions = religions.data;
                this.locations = locations.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.academicYears = years.data;
                this.statuses = statuses.data;
                this.hostels = hostels.data;
                this.houses = houses.data;
                const activeYear = this.academicYears.find(y => y.isActive === true);
                if (activeYear) {
                    this.form.academicYearId = activeYear.id;
                }

                /* ✅ DEFAULT STATUS = "Active" */
                const activeStatus = this.statuses.find(
                    s => s.name?.toLowerCase() === 'active'
                );
                if (activeStatus) {
                    this.form.statusId = activeStatus.id;
                }

                // Initialize dropdowns after data is ready
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

            $('#classId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.classId = args.value
            });

            $('#countryId').ejDropDownList({
                dataSource: this.countries,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.countryId = args.value
            });

            $('#cityId').ejDropDownList({
                dataSource: this.cities,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.cityId = args.value
            });

            $('#locationId').ejDropDownList({
                dataSource: this.locations,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.locationId = args.value
            });

            $('#religionId').ejDropDownList({
                dataSource: this.religions,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.religionId = args.value
            });

            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.academicYearId, 
                change: args => this.form.academicYearId = args.value
            });


            $('#statusId').ejDropDownList({
                dataSource: this.statuses,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.statusId,
                change: args => this.form.statusId = args.value
            });

            $('#hostelId').ejDropDownList({
                dataSource: this.hostels,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.hostelId = args.value
            });
            $('#houseId').ejDropDownList({
                dataSource: this.houses,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => this.form.houseId = args.value
            });

        },
        validateForm() {
            this.errors = {};

            const today = new Date();
            const todayStr = today.toISOString().substr(0, 10);

            // ✅ DOB Validation
            if (!this.form.dateOfBirth) {
                this.errors.dateOfBirth = 'Date of birth is required.';
            } else if (this.form.dateOfBirth >= todayStr) {
                this.errors.dateOfBirth = 'Child must be at least 1 day old.';
            }

            // Required fields
            if (!this.form.admissionDate) {
                this.errors.admissionDate = 'Admission Date is required.';
            }

            if (!this.form.classId || this.form.classId === this.emptyGuid) {
                this.errors.classId = 'Class is required.';
            }

            if (!this.form.countryId || this.form.countryId === this.emptyGuid) {
                this.errors.countryId = 'Country is required.';
            }

            if (!this.form.cityId || this.form.cityId === this.emptyGuid) {
                this.errors.cityId = 'City is required.';
            }

            if (!this.form.religionId || this.form.religionId === this.emptyGuid) {
                this.errors.religionId = 'Religion is required.';
            }

            if (!this.form.academicYearId || this.form.academicYearId === this.emptyGuid) {
                this.errors.academicYearId = 'Academic Year is required.';
            }

            if (!this.form.statusId || this.form.statusId === this.emptyGuid) {
                this.errors.statusId = 'Status is required.';
            }
            if (!this.form.firstName) {
                this.errors.firstName = 'First Name is required.';
            }
            if (!this.form.lastName) {
                this.errors.lastName = 'Last Name is required.';
            }
            if (!this.form.gender){
                this.errors.gender = 'Gender is required.';
            }
            if (!this.form.address) {
                this.errors.address = 'Address is required.';
            }

            return Object.keys(this.errors).length === 0;
        },
        saveStudent() {
            if (!this.validateForm()) {
                this.toastHandler('error', 'Please enter required fields.');
                return;
            }
            axios.post('/SmStudentSetUps/CreateStudent', this.form)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'Student saved successfully.');
                        this.bioSaved = true;
                        this.form.id = response.data.id;
                        window.location.href =
                            '/SmStudentSetUps/EditPreClassStudents?id=' + this.form.id;
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                })
                .catch(() => {
                    this.toastHandler('error', 'Unable to save student.');
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

        setDefaultDates() {
            const today = new Date().toISOString().substr(0, 10);
            this.form.dateOfBirth = today;
            this.form.admissionDate = today;
            this.form.balanceDueDate = today;
        }

    },

    mounted() {
        this.loadDropdowns();
        this.setDefaultDates();
    }
});
app.mount('#app');
