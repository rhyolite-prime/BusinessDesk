using Akka.Actor;

namespace TopazERP.Actors;

public class TopLevelActors
{
    public delegate IActorRef PayslipDispatchActorProvider();
    public delegate IActorRef ApInvoiceDispatchActorProvider();
    public delegate IActorRef ArInvoiceDispatchActorProvider();
}