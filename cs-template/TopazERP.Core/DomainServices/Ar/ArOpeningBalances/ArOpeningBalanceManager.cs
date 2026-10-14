using Abp.Domain.Repositories;
using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Ap;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ar.ArOpeningBalances;

public class ArOpeningBalanceManager: Abp.Domain.Services.DomainService, IArOpeningBalanceManager
{
    
    private readonly IRepository<ArOpeningBalance, Guid> _repositoryOpeningBalances;
    private readonly IRepository<Customer, Guid> _repositoryCustomer;
    private readonly IRepository<CostCenter, Guid> _repositoryCostCenter;

    public ArOpeningBalanceManager(IRepository<ArOpeningBalance, Guid> repositoryOpeningBalances,
        IRepository<Customer, Guid> repositoryCustomer, IRepository<CostCenter, Guid> repositoryCostCenter)
    {
        _repositoryOpeningBalances = repositoryOpeningBalances;
        _repositoryCustomer = repositoryCustomer;
        _repositoryCostCenter = repositoryCostCenter;
    }

    public async Task<object> Create(ArOpeningBalance entity)
    {
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == entity.CustomerId);
        if (customer == null)
        {
            return new
            {
                code = 404,
                message = "Customer not found."
            };
        }
        
        var existingEntry = await _repositoryOpeningBalances
            .FirstOrDefaultAsync(x => x.CustomerId == entity.CustomerId && x.CurrencyId == entity.CurrencyId);

        if (existingEntry != null)
        {
            return new
            {
                code = 400,
                message = "An opening balance already exists for this supplier with the specified currency."
            };
        }
        
       
        await _repositoryOpeningBalances.InsertAsync(entity);

        return new
        {
            id = entity.Id,
            code = 200,
            message = "Opening balance created successfully."
        };
    }
    
    public async Task<object> ListAll()
    {
        var openingBalances = await _repositoryOpeningBalances.GetAllListAsync();
        return openingBalances;
    }
    
    public async Task Update(ArOpeningBalance entity)
    {
        await _repositoryOpeningBalances.UpdateAsync(entity);
    }
    
    public async Task Delete(Guid Id)
    {
        await _repositoryOpeningBalances.DeleteAsync(Id);
    }
    
    public async Task<object> PostArOpeningBalances(List<Guid> balanceIds)
    {
        var openingBalances = await _repositoryOpeningBalances.GetAllListAsync(x => balanceIds.Contains(x.Id));
        foreach (var balance in openingBalances)
        {
            balance.IsPosted = true;
            await _repositoryOpeningBalances.UpdateAsync(balance);
            var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == balance.CustomerId);
            decimal convertedAmount = balance.Amount * (balance.BuyRate / customer.BuyingRate);
            customer.Balance += convertedAmount;
            await _repositoryCustomer.UpdateAsync(customer);
        }
        return new
        {
            code = 200,
            message = "Opening balances posted successfully."
        };
    }
    
    public async Task<object> GetPostedOpeningBalances()
    {
        var openingBalances = await _repositoryOpeningBalances.GetAllListAsync(x => x.IsPosted == true);
        return openingBalances;
    }
    
    public async Task<ArOpeningBalance> GetAsync(string customerName, string currencyName)
    {
        var openingBalance = await _repositoryOpeningBalances.FirstOrDefaultAsync(x => 
            !string.IsNullOrEmpty(customerName) && x.CustomerName.Trim().ToLower() == customerName.Trim().ToLower() && 
            !string.IsNullOrEmpty(currencyName) && x.CurrencyName.Trim().ToLower() == currencyName.Trim().ToLower()
        );
        return openingBalance;
    }
    
    public async Task<Guid?> GetOuIdByHierarchyAsync(string hierarchyName)
    {
        if (string.IsNullOrWhiteSpace(hierarchyName)) 
            return null;

        var parts = hierarchyName.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (!parts.Any()) return null;

        Guid? parentId = Guid.Empty;
        CostCenter current = null;

        foreach (var part in parts)
        {
            var name = part.Trim();

            current = await _repositoryCostCenter.FirstOrDefaultAsync(c =>
                c.Name == name &&
                c.ParentId == parentId);

            if (current == null)
            {
                return null; // hierarchy not found
            }

            parentId = current.Id; // move deeper down the tree
        }

        return current?.Id;
    }
    
}