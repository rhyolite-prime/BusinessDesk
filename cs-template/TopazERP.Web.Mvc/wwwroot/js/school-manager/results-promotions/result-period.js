const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            periods: [],
            academicYears: [],
            terms: [],
            semesterOptions: []
        }
    },
    methods: {
        getSetupData() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmResultsPromotions/GetAllPeriods/')
            ]).then(axios.spread((years, terms, periods) => {

                this.academicYears = years.data;
                this.terms = terms.data;
                this.periods = periods.data;
                this.semesterOptions = [];

                this.academicYears.forEach(y => {
                    this.terms.forEach(t => {
                        this.semesterOptions.push({
                            id: `${y.id}_${t.id}`, 
                            academicYearId: y.id,
                            termId: t.id,
                            name: `${y.name} - ${t.name}`
                        });
                    });
                });

                this.periods = periods.data.map(p => ({
                    ...p,
                    semesterId: `${p.academicYearId}_${p.termId}`,
                    startDate: this.formatShortDate(p.startDate),
                    endDate: this.formatShortDate(p.endDate)
                }));
                

                this.dataTable(this.periods);

            })).catch(() => {
                this.toastHandler('error', 'Unable to get data.');
            });
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
                    {
                        field: "semesterId",
                        headerText: "Semester",
                        editType: ej.Grid.EditingType.Dropdown,
                        foreignKeyField: "id",
                        foreignKeyValue: "name",
                        dataSource: this.semesterOptions,
                        width: 75
                    },

                    { field: "startDate", headerText: "Start Date", validationRules: { required: true }, width: 75, editType: ej.Grid.EditingType.DatePicker },
                    { field: "endDate", headerText: "End Date", validationRules: { required: true }, width: 75, editType: ej.Grid.EditingType.DatePicker },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15 }
                ],
                endAdd: (args) => {
                    this.saveData(args.data);
                },
                endEdit: (args) => {
                    this.updateData(args.data);
                },
                endDelete: (args) => {
                    this.delData(args.data.id);
                }
            });
        },

        saveData(payload) {
            const semester = this.semesterOptions.find(s => s.id === payload.semesterId);

            if (!semester) {
                this.toastHandler('error', 'Invalid semester selected.');
                return;
            }
            
            if (payload.startDate > payload.endDate) {
                this.toastHandler('error', 'Start date cannot be greater than end date.');
                return;
            }
            
            if (payload.endDate < payload.startDate) {
                this.toastHandler('error', 'End date cannot be less than start date.');
                return;
            }

            payload.academicYearId = semester.academicYearId;
            payload.termId = semester.termId;

            delete payload.semesterId;
            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmResultsPromotions/CreatePeriod/', payload)
                .then(res => {
                    if (res.data.code === 200) {
                        this.getSetupData();
                        this.toastHandler('', 'Data saved.');
                    } else {
                        this.toastHandler('error', res.data.message);
                    }
                });
        },

        updateData(payload) {
            const semester = this.semesterOptions.find(s => s.id === payload.semesterId);

            payload.academicYearId = semester.academicYearId;
            payload.termId = semester.termId;

            delete payload.semesterId;
            if (payload.startDate > payload.endDate) {
                this.toastHandler('error', 'Start date cannot be greater than end date.');
                return;
            }

            if (payload.endDate < payload.startDate) {
                this.toastHandler('error', 'End date cannot be less than start date.');
                return;
            }

            axios.post('/SmResultsPromotions/UpdatePeriod', payload)
                .then(() => {
                    this.getSetupData();
                    this.toastHandler('', 'Data updated.');
                }).catch(err => {

                this.toastHandler('error', 'Unable to update data.');

            });
        },

        delData(id) {

            axios.get('/SmResultsPromotions/DeletePeriod?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'data deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete selected data');

            });
        },
        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

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
        this.getSetupData();

    },
});
app.mount('#app');