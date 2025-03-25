import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RankingParejasComponent } from './ranking-parejas.component';

describe('RankingParejasComponent', () => {
  let component: RankingParejasComponent;
  let fixture: ComponentFixture<RankingParejasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RankingParejasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RankingParejasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
