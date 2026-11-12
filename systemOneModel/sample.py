import laya
from laya import Router

router = Router(preload=True)

state = {
    "from": "user@acme.com",
    "subject": "Duplicate charge on invoice #4411",
    "body": "Hi, we were billed twice for March. Please refund the duplicate today or we will cancel our plan.",
}

questions = {
    "department": {
        "type": "choice",
        "instructions": "Which department should handle this request?",
        "criteria": {
            "billing": "invoices, payments, refunds",
            "technical": "bugs, outages, system errors",
            "sales": "pricing, new contracts",
            "other": "everything else",
        },
    },
    "urgency": {
        "type": "score",
        "instructions": "How urgent is this request?",
        "criteria": ["not urgent", "soon", "critical deadline or blocking issue"],
    },
    "churn_risk": {
        "type": "noul",
        "instructions": "Does the user threaten to cancel or leave?",
    },
}

res = router.predict(state, questions)

answers = res["answers"]
print("department :", answers["department"]["choice"], f"({answers['department']['confidence']:.2f})")
print("urgency    :", f"{answers['urgency']['score']:.2f} / 2.0")
print("churn_risk :", f"{answers['churn_risk']['noul']:.3f}")
print("routing    :", res["routing"]["model"])