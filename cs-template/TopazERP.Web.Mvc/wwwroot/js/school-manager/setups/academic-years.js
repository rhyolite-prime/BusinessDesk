const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            academicYearList: [],
            termList: [],
            termDetails: [],
            termMap: {},
            termDetailsMap: {},
            actualLevelList: [],
            terms: [],
        }
    },

    methods: {
        formatDate(dateInput) {
            return moment(dateInput).format("DD-MMM-YYYY");
        },
        getSetupData() {
            return Promise.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllAcademicYearTerms'),
                axios.get('/SmMainSetups/ListAllAcademicYearTermDetails'),
                axios.get(`/jsonDataSample/actualLevels.json?v=${new Date().getTime()}`),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
            ]).then(([academicYears, terms, termDetails, actualLevels, allTerms]) => {
                this.academicYearList = academicYears.data;
                this.termList = terms.data;
                this.termDetails = termDetails.data;
                this.actualLevelList = actualLevels.data;
                this.terms = allTerms.data;

                this.termMap = {};
                this.academicYearList.forEach(years => {
                    years._startDate = new Date(years.startDate);
                    years._endDate = new Date(years.endDate);
                    //format date
                    years.startDate = this.formatDate(years.startDate);
                    years.endDate = this.formatDate(years.endDate);
                    years.terms = [];
                    years.academicYearId = years.id;
                    this.termMap[years.id] = years.terms.map(term => {
                        term.academicYearId = years.id;
                        this.termList.push(term);
                        this.academicYearId = years.id;
                        return term
                    });
                });
                this.termDetailsMap = {};
                this.termList.forEach(term => {
                    // keep raw date objects for comparisons
                    term._startDate = new Date(term.startDate);
                    term._endDate = new Date(term.endDate);
                    //format date
                    term.startDate = this.formatDate(term.startDate);
                    term.endDate = this.formatDate(term.endDate);
                    term.details = [];
                    term.academicYearTermId = term.id;
                    this.termDetailsMap[term.id] = term.details.map(detail => {
                        detail.academicYearTermId = term.id;
                        this.termDetails.push(detail);
                        this.academicYearTermId = term.id;
                        return detail
                    });
                });
                this.termDetails.forEach(detail => {
                    // keep raw date objects for comparisons
                    detail._startDate = new Date(detail.startDate);
                    detail._endDate = new Date(detail.endDate);
                    //format date
                    detail.startDate = this.formatDate(detail.startDate);
                    detail.endDate = this.formatDate(detail.endDate);
                });

                // build grids after all data is available
                this.dataTable(this.academicYearList);
            }).catch(err => {
                this.toastHandler('error', 'Unable to load setups.');
            });
        },
        getAcademicYearDetails(id) {
           return this.academicYearList.find(a => a.id === id);
        },
        getAcademicYearTermDetails(id) {
              return this.termList.find(t => t.id === id);
        },
        getTermDetails(id) {
                return this.termDetails.find(d => d.id === id);
        },
        dataTable(responseData) {
            $("#dataTable").ejGrid({
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
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "id", width: 25, visible: false, isPrimaryKey: true,  },
                    { field: "name", headerText: "Academic Year", validationRules: { required: true, minlength: 1 }, width: 75 },
                    { field: "startDate", headerText: "Start Date", width: 80, format: "{0:dd-MMM-yyyy}", validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                    { field: "endDate", headerText: "End Date", width: 80, format: "{0:dd-MMM-yyyy}", validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                    { field: "isActive", headerText: "Is Active", width: 60, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean,type: "boolean"},
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },
                ],
                childGrid: {
                    // use the Vue array so the child grid can filter by queryString
                    dataSource: this.termList,
                    queryString: "academicYearId",
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
                        toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search]
                    },
                    columns: [
                        { field: "id", isPrimaryKey: true, visible: false, width: 25},
                        /*{ field: "termId", headerText: "Term", validationRules: { required: true }, width: 120 },*/
                        {
                            // replace the existing termId column
                            field: "termId",
                            headerText: "Term",
                            validationRules: {required: true},
                            width: 120,
                            editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left,  dataSource: this.terms
                        },
                        { field: "startDate", headerText: "Start Date", width: 80, format: "{0:dd-MMM-yyyy}", validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                        { field: "endDate", headerText: "End Date", width: 80, format: "{0:dd-MMM-yyyy}", validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                        { field: "ordinal", headerText: "Ordinal Level", defaultValue: 1, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, validationRules: { required: true, }, width: 40 },
                        /*{ field: "actualLevelId", headerText: "Actual Level", validationRules: { required: true }, width: 120 },*/
                        {
                            // replace the existing actualLevelId column
                            field: "actualLevelId",
                            headerText: "Actual Level",
                            validationRules: {required: true},
                            width: 120,
                            editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left,  dataSource: this.actualLevelList
                        },
                        { field: "academicYearId", visible: false },
                        { field: "tenantId", visible: false }
                    ],
                    childGrid: {
                        // use the Vue array so the child grid can filter by queryString
                        dataSource: this.termDetails,
                        queryString: "academicYearTermId",
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
                            toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search]
                        },
                        columns: [
                            { field: "id", isPrimaryKey: true, visible: false, width: 25 },
                            { field: "activityDescription", headerText: "Activity Description", validationRules: { required: true }, width: 120 },
                            { field: "startDate", headerText: "Start Date", width: 80, format: "{0:dd-MMM-yyyy}", validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                            { field: "endDate", headerText: "End Date", width: 80, format: "{0:dd-MMM-yyyy}", validationRules: { date: true }, editType: ej.Grid.EditingType.DatePicker, textAlign: ej.TextAlign.Left },
                            { field: "academicYearTermId", visible: false },
                            { field: "tenantId", visible: false }
                        ],
                        endAdd: (args) => {
                            if (!args.data.academicYearTermId || args.data.academicYearTermId === this.emptyGuid) {
                                args.data.academicYearTermId = this.academicYearTermId;
                            }
                            const selectedTerm = this.terms.find(a => a.id === args.data.academicYearTermId);
                            if (selectedTerm) {
                                args.data.academicYearTermName = selectedTerm.name;
                            } else {
                                args.data.academicYearTermName = "unknown";
                            }
                            this.saveAcademicYearTermDetail(args.data);
                        },
                        endEdit: (args) => {
                            if (!args.data.termId || args.data.termId === this.emptyGuid) {
                                args.data.termId = this.termId;
                            }
                            const selectedTerm = this.terms.find(a => a.id === args.data.termId);
                            if (selectedTerm) {
                                args.data.termName = selectedTerm.name;
                            } else {
                                args.data.termName = "unknown";
                            }
                            this.updateAcademicYearTermDetail(args.data);
                        },
                        endDelete: (args) => {
                            this.delAcademicYearTermDetail(args.data.id);
                        }
                    },
                    endAdd: (args) => {
                        // termid
                        if (!args.data.termId || args.data.termId === this.emptyGuid) {
                            args.data.termId = this.termId;
                        }
                        const selectedTerm = this.terms.find(a => a.id === args.data.termId);
                        if (selectedTerm) {
                            args.data.termName = selectedTerm.name;
                        } else {
                            args.data.termName = "unknown";
                        }
                        //academicYearId
                       if (!args.data.academicYearId || args.data.academicYearId === this.emptyGuid) {
                            args.data.academicYearId = this.academicYearId;
                        }
                       const selectedYear = this.academicYearList.find(a => a.id === args.data.academicYearId);
                       if (selectedYear) {
                           args.data.academicYearName = selectedYear.name;
                       } else {
                           args.data.academicYearName = "unknown";
                       }
                       // actualLevelId
                       if (!args.data.actualLevelId || args.data.actualLevelId === this.emptyGuid) {
                            args.data.actualLevelId = this.actualLevelId;
                        }
                       const selectedLevel = this.actualLevelList.find(a => a.id === args.data.actualLevelId);
                       if (selectedLevel) {
                           args.data.actualLevelName = selectedLevel.name;
                       } else {
                           args.data.actualLevelName = "unknown";
                       }
                        
                        this.saveTerm(args.data);
                    },
                    endEdit: (args) => {
                        // termid
                        if (!args.data.termId || args.data.termId === this.emptyGuid) {
                            args.data.termId = this.termId;
                        }
                        const selectedTerm = this.terms.find(a => a.id === args.data.termId);
                        if (selectedTerm) {
                            args.data.termName = selectedTerm.name;
                        } else {
                            args.data.termName = "unknown";
                        }
                        //academicYearId
                        if (!args.data.academicYearId || args.data.academicYearId === this.emptyGuid) {
                            args.data.academicYearId = this.academicYearId;
                        }
                        const selectedYear = this.academicYearList.find(a => a.id === args.data.academicYearId);
                        if (selectedYear) {
                            args.data.academicYearName = selectedYear.name;
                        } else {
                            args.data.academicYearName = "unknown";
                        }
                        // actualLevelId
                        if (!args.data.actualLevelId || args.data.actualLevelId === this.emptyGuid) {
                            args.data.actualLevelId = this.actualLevelId;
                        }
                        const selectedLevel = this.actualLevelList.find(a => a.id === args.data.actualLevelId);
                        if (selectedLevel) {
                            args.data.actualLevelName = selectedLevel.name;
                        } else {
                            args.data.actualLevelName = "unknown";
                        }

                        this.updateTerm(args.data);
                    },
                    endDelete: (args) => {
                        this.delTerm(args.data.id);
                    }
                },
                endAdd: (args) => {
                    this.saveAcademicYear(args.data);
                },
                endEdit: (args) => {
                    this.updateAcademicYear(args.data);
                },
                endDelete: (args) => {
                    this.delAcademicYear(args.data.id);
                }
            });
        },

        async saveAcademicYear(payload) {

            delete payload.id;
            delete payload.tenantId;
            
            // start date cannot be after end date
            if (new Date(payload.startDate) > new Date(payload.endDate)) {
                this.toastHandler('error', 'Start date cannot be after end date.');
                return;
            }
            //end date cannot be before start date
            if (new Date(payload.endDate) < new Date(payload.startDate)) {
                this.toastHandler('error', 'End date cannot be before start date.');
                return;
            }
            // prevent multiple isActive=true
            // prevent multiple active academic years
            const activeYearExists = this.academicYearList.some(
                year => year.isActive === true
            );

            if (payload.isActive && activeYearExists) {
                this.toastHandler(
                    'error',
                    'Only one academic year can be active at a time.'
                );
                return;
            }

            axios.post('/SmMainSetups/CreateAcademicYear/', payload).then(response => {
                if (response.data.code === 200) {
                    this.toastHandler('', 'Academic year saved.');
                    this.getSetupData();
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save academic year.');

            });
        },

        async updateAcademicYear(payload) {

            // start date cannot be after end date
            if (new Date(payload.startDate) > new Date(payload.endDate)) {
                this.toastHandler('error', 'Start date cannot be after end date.');
                return;
            }

            // end date cannot be before start date
            if (new Date(payload.endDate) < new Date(payload.startDate)) {
                this.toastHandler('error', 'End date cannot be before start date.');
                return;
            }

            // If this academic year is being made active
            if (payload.isActive) {

                // Find the currently active academic year
                const oldActiveYear = this.academicYearList.find(
                    year => year.isActive === true && year.id !== payload.id
                );

                // If another year is currently active, deactivate it first
                if (oldActiveYear) {

                    const oldPayload = {
                        ...oldActiveYear,
                        isActive: false
                    };

                    await axios.post(
                        '/SmMainSetups/UpdateAcademicYear/',
                        oldPayload
                    );
                }
            }

            // Now update the selected academic year
            axios.post(
                '/SmMainSetups/UpdateAcademicYear/',
                payload
            )
                .then(response => {

                    this.getSetupData();

                    this.toastHandler(
                        '',
                        'Academic year updated.'
                    );

                })
                .catch(err => {

                    this.toastHandler(
                        'error',
                        'Unable to update academic year.'
                    );

                });
        },

        delAcademicYear(id) {

            axios.get('/SmMainSetups/DeleteAcademicYear?id='+id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Academic year deleted.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to delete academic year.');

            });
        },

        saveTerm(payload) {
            // parse incoming dates as Date objects for correct comparison
            const start = new Date(payload.startDate);
            const end = new Date(payload.endDate);

            // find academic year (which now has _startDate and _endDate)
            const academicYear = this.academicYearList.find(y => y.id === payload.academicYearId);
            if (!academicYear) {
                this.toastHandler('error', 'Academic year not found.');
                return;
            }

            // validate ranges using Date objects
            if (start < academicYear._startDate) {
                this.toastHandler('error', 'Term start date must be on or after the academic year start date.');
                return;
            }
            if (end > academicYear._endDate) {
                this.toastHandler('error', 'Term end date must be on or before the academic year end date.');
                return;
            }

            // convert to server format just before sending
            payload.startDate = start.toLocaleDateString("en-US");
            payload.endDate = end.toLocaleDateString("en-US");

        
            

           

            axios.post('/SmMainSetups/CreateAcademicYearTerm/', payload).then(response => {
                this.toastHandler('', 'Term saved.');
                this.getSetupData();
            }).catch(err => {
                this.toastHandler('error', 'Unable to save term.');
            });
        },


        updateTerm(payload) {

            // parse incoming dates as Date objects for correct comparison
            const start = new Date(payload.startDate);
            const end = new Date(payload.endDate);

            // find academic year (which now has _startDate and _endDate)
            const academicYear = this.academicYearList.find(y => y.id === payload.academicYearId);
            if (!academicYear) {
                this.toastHandler('error', 'Academic year not found.');
                return;
            }

            // validate ranges using Date objects
            if (start < academicYear._startDate) {
                this.toastHandler('error', 'Term start date must be on or after the academic year start date.');
                return;
            }
            if (end > academicYear._endDate) {
                this.toastHandler('error', 'Term end date must be on or before the academic year end date.');
                return;
            }

            // convert to server format just before sending
            payload.startDate = start.toLocaleDateString("en-US");
            payload.endDate = end.toLocaleDateString("en-US");


            axios.post('/SmMainSetups/UpdateAcademicYearTerm/', payload).then(response => {

                this.toastHandler('', 'Term updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update term.');

            });
        },

        delTerm(id) {

            axios.post('/SmMainSetups/DeleteAcademicYearTerm?id=' + id)
                .then(response => {

                    this.toastHandler('', 'Term deleted.');

                })
                .catch(err => {

                    console.error(err);
                    this.toastHandler('error', 'Unable to delete term.');

                });
        },
        
        saveAcademicYearTermDetail(payload) {
            const start = new Date(payload.startDate);
            const end = new Date(payload.endDate);

            // find parent term (term now has _startDate/_endDate)
            const parentTerm = this.termList.find(t => t.id === payload.academicYearTermId);
            if (!parentTerm) {
                this.toastHandler('error', 'Parent term not found.');
                return;
            }

            if (start < parentTerm._startDate || end > parentTerm._endDate) {
                this.toastHandler('error', 'Term detail dates must fall within the parent term date range.');
                return;
            }

            payload.startDate = start.toLocaleDateString("en-US");
            payload.endDate = end.toLocaleDateString("en-US");



            axios.post('/SmMainSetups/CreateAcademicYearTermDetail/', payload).then(response => {
                this.toastHandler('', 'Term detail saved.');
                this.getSetupData();
            }).catch(err => {
                this.toastHandler('error', 'Unable to save term detail.');
            });
        },

        updateAcademicYearTermDetail(payload) {

            const start = new Date(payload.startDate);
            const end = new Date(payload.endDate);

            const parentTerm = this.termList.find(t => t.id === payload.academicYearTermId);
            if (!parentTerm) {
                this.toastHandler('error', 'Parent term not found.');
                return;
            }

            if (start < parentTerm._startDate || end > parentTerm._endDate) {
                this.toastHandler('error', 'Term detail dates must fall within the parent term date range.');
                return;
            }

            payload.startDate = start.toLocaleDateString("en-US");
            payload.endDate = end.toLocaleDateString("en-US");


            axios.post('/SmMainSetups/UpdateAcademicYearTermDetail/', payload).then(response => {

                this.toastHandler('', 'Term detail updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update term detail.');

            });
        },

        delAcademicYearTermDetail(id) {

            axios.post('/SmMainSetups/DeleteAcademicYearTermDetail?id=' + id).then(response => {

                this.toastHandler('', 'Term detail deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete term detail.');

            });
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

        uuid() {

            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
    },
     
    mounted() {

        this.getSetupData();
    },
});
app.mount('#app');