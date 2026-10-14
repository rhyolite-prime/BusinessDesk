using Abp.Domain.Repositories;
using TopazERP.DomainServices.Payroll.PayCalendars.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace TopazERP.DomainServices.Payroll.PayCalendars
{
   public class PayCalendarManager : Abp.Domain.Services.DomainService, IPayCalendarManager
    {
        private readonly IRepository<PayCalendar, Guid> _repositoryPayCalendar;
        private readonly IRepository<InitializePayMonth, Guid> _repositoryInitializePayMonth;

        public PayCalendarManager(IRepository<PayCalendar, Guid> repositoryPayCalendar, IRepository<InitializePayMonth, Guid> repositoryInitializePayMonth)
        {
            _repositoryPayCalendar = repositoryPayCalendar;
            _repositoryInitializePayMonth = repositoryInitializePayMonth;
        }

        public async Task Create(PayCalendar entity)
        {
            await _repositoryPayCalendar.InsertAsync(entity);

        }

        public async Task<object> CreatePayCalendarDetails(PayCalendarDetailInput input)
        {
            var payCalendarData = await _repositoryPayCalendar.GetAsync(input.PayCalendarId);
            var calendarList = payCalendarData.PayCalendarDetails;
            var calendarInfo = calendarList.FirstOrDefault(x => x.Id == input.Id);

            if (calendarInfo == null)
            {
                
                var existingPayCalendarDetail =
                    payCalendarData.PayCalendarDetails.FirstOrDefault(x => x.Month == input.Month && x.PayCalendarId == input.PayCalendarId);

                if (existingPayCalendarDetail != null)
                {
                    return new
                    {
                        code = 400,
                        message = "Duplicate records are not allowed."
                    };
                }
                
                
                payCalendarData.PayCalendarDetails.Add(new PayCalendarDetail
                {
                    Id = input.Id,
                    PayCalendarId= input.PayCalendarId,
                    Year= payCalendarData.Year, 
                    Days = input.Days, 
                    Month= input.Month,

                });

                await _repositoryPayCalendar.UpdateAsync(payCalendarData);

                return new
                {
                    code = 200,
                    message = "successful"
                };
            }

            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }


        public async Task Update(PayCalendar entity)
        {
            await _repositoryPayCalendar.UpdateAsync(entity);
        }

        public async Task UpdatePayCalendarDetails(PayCalendarDetailInput input)
        {
            var payCalendarData = await _repositoryPayCalendar.GetAsync(input.PayCalendarId);
            var calendarList = payCalendarData.PayCalendarDetails;
            var calendarInfo = calendarList.FirstOrDefault(x => x.Id == input.Id);

            calendarList.Remove(calendarInfo);

            if (calendarInfo != null)
            {
                calendarInfo.Year = payCalendarData.Year;
                calendarInfo.Days = input.Days;
                calendarInfo.Month = input.Month;

                calendarList.Add(calendarInfo);
            }

            payCalendarData.PayCalendarDetails = calendarList;

            await _repositoryPayCalendar.UpdateAsync(payCalendarData);
        }


        public async Task<object> GetDefaultAllowanceDays()
        {
            var currentPayMonth =  await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            if (currentPayMonth != null)
            {
                var payCalendarHeader =  await _repositoryPayCalendar.FirstOrDefaultAsync(x=> x.Year == currentPayMonth.Year);

                if (currentPayMonth != null)
                {
                    return payCalendarHeader.PayCalendarDetails.FirstOrDefault(a =>
                        a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year);
                }
                
            }

            return null; 
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryPayCalendar.GetAllListAsync();
            return data.OrderByDescending(a => a.Year).ToList();

        }
        public async Task Delete(Guid id)
        {
            await _repositoryPayCalendar.DeleteAsync(id);

        }

        //
        public async Task DeletePayCalendarDetails(PayCalendarDetailInput input)
        {
            var payCalendarData = await _repositoryPayCalendar.GetAsync(input.PayCalendarId);
            var calendarList = payCalendarData.PayCalendarDetails;
            var calendarInfo = calendarList.FirstOrDefault(x => x.Id == input.Id);

            calendarList.Remove(calendarInfo);

            payCalendarData.PayCalendarDetails = calendarList;

            await _repositoryPayCalendar.UpdateAsync(payCalendarData);

        }

    }
}
